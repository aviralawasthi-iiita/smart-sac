import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError}  from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { Admin } from "../models/admin.model.js";

import { EquipmentHistory } from "../models/equipmentHistory.js";
import { Message } from "../models/message.model.js";
import { Ticket } from "../models/ticket.model.js";
import { Equipment } from "../models/equipment.model.js";
import { Game } from "../models/game.model.js";
import { Announcement } from "../models/announcement.model.js";
import { application } from "express";
import { User } from "../models/user.model.js";

const generateAccessTokenAndRefreshTokens = async (userId) => {
  try {
    const user = await Admin.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error while generating tokens");
  }
};


const registerAdmin = asyncHandler(async(req,res) => {
    const {email,password} = req.body;
    if(!email){
        throw new ApiError(400,"all fields are required");
    }
    if (password !== process.env.ADMIN_PASSWORD) {
      throw new ApiError(401, "Invalid password");
    }

    const existedUser = await Admin.findOne({ email });
    if(existedUser){
        throw new ApiError(409,"user with email" );
    }
    const user = await Admin.create({
        email
    })
    const usercheck = await Admin.findById(user._id).select("-refreshToken");

    if(!usercheck){
        throw new ApiError(500,"user not created");
    }
    return res.status(201).json(
        new ApiResponse(200,usercheck,"User created succesfully")
    )
});


const loginAdmin = asyncHandler( async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      throw new ApiError(401, "Invalid password");
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      throw new ApiError(404, "Admin not found");
    }

    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshTokens(admin._id);

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    console.log("Admin logged in");

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Admin logged in successfully"
        )
      );
  } catch (err) {
    throw new ApiError(500,err);
  }
});


const logoutAdmin = asyncHandler(async(req,res)=> {
    await Admin.findByIdAndUpdate(req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new:true
        }
    );
    const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json({ message: "Admin logged out successfully" });;
});

const refreshAccessToken = asyncHandler(async(req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(500,"genrateing refrees gone wrong");
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await Admin.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401,"invalid rerresh token");
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"not smae");
        }
        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", 
            sameSite: "strict", 
            };
        const {accessToken,refreshToken} =  await generateAccessTokenAndRefreshTokens(user._id);
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(new ApiResponse(
            200,
            {
                accessToken,refreshToken
            },
            "admin loggin in succesfully",
        ))
    } catch (error) {
        throw new ApiError(501, error?.message || "refreshtoken problem");
    }
})

const getCurrentAdmin = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {email} = req.body;
    if(!email){
        throw new ApiError(400,"Email is required");
    }
    const user = await Admin.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                email
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user, "account details updated"))
})

const dashboardDetails = asyncHandler(async (req,res)=>{
  const user = req.user;
  if(!user) throw new ApiError(500, "no user found");
  const [
    equipment,
    announcements,
    ticket,
    equipmentHistory
  ] = await Promise.all([
    Equipment.find().lean(),
    Announcement.find().sort({ createdAt: -1 }).limit(2).lean(),
    Ticket.find().lean().sort({ createdAt: -1 }).limit(5),
    EquipmentHistory.find().sort({ changedAt: -1 }).limit(5).populate("equipment", "name status").populate("user", "name email roll_no").lean()
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {      
        equipment,  
        announcements,
        ticket,
        equipmentHistory
      },
      "Dashboard details sent"
    )
  );
});

const updateEquipment = asyncHandler(async (req, res) => {
  const { status, equipment, roll_no, duration } = req.body;

  if (!status) throw new ApiError(400, "Status is required");
  if (!equipment || !equipment._id) throw new ApiError(400, "Equipment ID is required");

  const equipmentDoc = await Equipment.findById(equipment._id);
  if (!equipmentDoc) throw new ApiError(404, "Equipment not found");

  let user = null;
  let registered = false;

  if (status === "in-use") {
    if (!roll_no || !duration) {
      throw new ApiError(400, "roll_no and duration are required for in-use status");
    }

    user = await User.findOne({ roll_no });
    await EquipmentHistory.create({
      equipment: equipmentDoc._id,
      status: equipmentDoc.status,
      user: equipmentDoc.user || null,
      roll_no: roll_no || null,
      duration: equipmentDoc.duration || null,
      changedAt: new Date(),
    });
    if (user) {
      registered = true;
      equipmentDoc.user = user._id;
    } else {
      registered = true;
      equipmentDoc.user = null;
    }
    equipmentDoc.duration = duration;
    equipmentDoc.status = "in-use";
  } else {
    await EquipmentHistory.create({
      equipment: equipmentDoc._id,
      status: equipmentDoc.status,
      user: equipmentDoc.user || null,
      duration: equipmentDoc.duration || null,
      changedAt: new Date(),
    });

    equipmentDoc.user = null;
    equipmentDoc.duration = null;
    equipmentDoc.status = status;
  }

  await equipmentDoc.save();

  const responseData = {
    equipment: equipmentDoc,
    registered,
    user: user ? user : { roll_no },
  };

  return res
    .status(200)
    .json(new ApiResponse(200, responseData, "Equipment updated successfully"));
});


const addGame = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    throw new ApiError(400, "Game name is required");
  }
  const existingGame = await Game.findOne({ name: name.toLowerCase().trim() });
  if (existingGame) {
    throw new ApiError(409, "Game with this name already exists");
  }
  const game = await Game.create({ name: name.toLowerCase().trim() });
  return res.status(201).json(
    new ApiResponse(201, game, "Game created successfully")
  );
});


const removeGame = asyncHandler(async (req, res) => {
  const { name } = req.query;

  if (!name || name.trim() === "") {
    throw new ApiError(400, "Game name is required");
  }
  const game = await Game.findOne({ name: name.toLowerCase().trim() });
  if (!game) {
    throw new ApiError(404, "Game not found");
  }

  await Equipment.deleteMany({ _id: { $in: game.equipment } });
  await Game.deleteOne({ _id: game._id });

  return res.status(200).json(
    new ApiResponse(200, null, "Game and associated equipment removed successfully")
  );
});

const addEquipment = asyncHandler(async (req, res) => {
  const { gameName, name } = req.body;

  if (!gameName || !name) {
    throw new ApiError(400, "Both gameName and equipment name are required");
  }
  const game = await Game.findOne({ name: gameName.toLowerCase().trim() });
  if (!game) {
    throw new ApiError(404, "Game not found");
  }

  const equipment = await Equipment.create({ name: name.toLowerCase().trim() });
  game.equipment.push(equipment._id);
  await game.save();

  return res.status(201).json(
    new ApiResponse(201, { equipment, game }, "Equipment added to game successfully")
  );
});

const removeEquipment = asyncHandler(async (req, res) => {
  const { gameName, name } = req.query;

  if (!gameName || !name) {
    throw new ApiError(400, "Both gameName and equipment name are required");
  }

  const game = await Game.findOne({ name: gameName.toLowerCase().trim() });
  if (!game) {
    throw new ApiError(404, "Game not found");
  }
  const equipment = await Equipment.findOne({ name: name.toLowerCase().trim() });
  if (!equipment) {
    throw new ApiError(404, "Equipment not found");
  }

  const index = game.equipment.findIndex(
    (id) => id.toString() === equipment._id.toString()
  );

  if (index === -1) {
    throw new ApiError(400, "Equipment not associated with this game");
  }
  game.equipment.splice(index, 1);
  await game.save();
  await Equipment.findByIdAndDelete(equipment._id);
  const updatedGame = await Game.findById(game._id).populate("equipment");

  return res.status(200).json(
    new ApiResponse(
      200,
      { game: updatedGame, removedEquipment: equipment },
      "Equipment removed successfully"
    )
  );
});


const makeAnnouncement = asyncHandler(async (req, res) => {
  const { heading, content, footer, expiresIn } = req.body;

  if (!heading || !content) {
    throw new ApiError(400, "Heading and content are required");
  }

  const daysToExpire = expiresIn && !isNaN(expiresIn) ? Number(expiresIn) : 90;
  if (daysToExpire <= 0) {
    throw new ApiError(400, "expiresIn must be a positive number of days");
  }
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + daysToExpire);

  const announcement = await Announcement.create({
    heading: heading.trim(),
    content: content.trim(),
    footer: footer?.trim() || "",
    expireAt: expirationDate,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      announcement,
      `Announcement created successfully (expires in ${daysToExpire} days)`
    )
  );
});

const getAnnouncements = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const announcements = await Announcement.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        announcements,
        currentPage: page,
      },
      "Announcements fetched successfully"
    )
  );
});


const getNoOfAnnouncements = asyncHandler(async (req, res) => {
  const totalAnnouncements = await Announcement.countDocuments();
  const limit = 10;
  const totalPages = Math.ceil(totalAnnouncements / limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalAnnouncements,
        totalPages,
      },
      "Announcement count fetched successfully"
    )
  );
}); 

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const announcement = await Announcement.findById(id);
  if (!announcement) {
    throw new ApiError(404, "Announcement not found");
  }

  await announcement.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Announcement deleted successfully"));
});

const updateTicket = asyncHandler(async (req, res) => {
  const { id, newStatus } = req.body;
  if (!id || !newStatus) {
    throw new ApiError(400, "Ticket ID and new status are required");
  }

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  const allowedStatuses = ["in-process", "open", "closed"];
  if (!allowedStatuses.includes(newStatus)) {
    throw new ApiError(400, "Invalid status value");
  }

  ticket.status = newStatus;
  await ticket.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      ticket,
      `Ticket status updated to '${newStatus}' successfully`
    )
  );
});

const getNoOfActiveTickets = asyncHandler(async (req, res) => {
  const totalTickets = await Ticket.countDocuments({
    status: { $in: ["in-process", "open"] },
  });

  const limit = 10;
  const totalPages = Math.ceil(totalTickets / limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalTickets,
        totalPages,
      },
      "Active ticket count fetched successfully"
    )
  );
});

const getActiveTickets = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const tickets = await Ticket.find({
    status: { $in: ["in-process", "open"] },
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("sender", "name email")
    .populate("equipment", "name");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tickets,
        currentPage: page,
      },
      "Active tickets fetched successfully"
    )
  );
});

const getRecentEquipmentHistory = asyncHandler(async (req, res) => {
  const limit = 10;
  const history = await EquipmentHistory.find()
    .sort({ changedAt: -1 })
    .limit(limit)
    .populate("equipment", "name status") 
    .populate("user", "name email roll_no"); 

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        history,
        count: history.length,
      },
      "Recent equipment history fetched successfully"
    )
  );
});


const getEquipmentRecentHistoryDict = asyncHandler(async (req, res) => {
  const equipments = await Equipment.find({}, "_id name");

  const equipmentHistoryDict = {};

  for (const eq of equipments) {
    const recentHistory = await EquipmentHistory.find({ equipment: eq._id })
      .sort({ changedAt: -1 })
      .limit(10)
      .populate("user", "name email roll_no"); 

    equipmentHistoryDict[eq.name] = recentHistory;
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      equipmentHistoryDict,
      "Recent 10 history entries per equipment fetched successfully"
    )
  );
});

const getNoOfEquipmentHistory = asyncHandler(async (req, res) => {
  const { equipmentId } = req.params;

  const equipment = await Equipment.findById(equipmentId);
  if (!equipment) throw new ApiError(404, "Equipment not found");

  const totalHistory = await EquipmentHistory.countDocuments({ equipment: equipmentId });
  const limit = 10;
  const totalPages = Math.ceil(totalHistory / limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalHistory,
        totalPages,
      },
      "Equipment history count fetched successfully"
    )
  );
});

const getEquipmentHistory = asyncHandler(async (req, res) => {
  const { equipmentId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const equipment = await Equipment.findById(equipmentId);
  if (!equipment) throw new ApiError(404, "Equipment not found");

  const history = await EquipmentHistory.find({ equipment: equipmentId })
    .sort({ changedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("user", "name email roll_no");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        history,
        currentPage: page,
      },
      "Equipment history fetched successfully"
    )
  );
});


export {
    loginAdmin,
    logoutAdmin,
    refreshAccessToken,
    updateAccountDetails,
    getCurrentAdmin,
    registerAdmin,
    dashboardDetails,
    updateEquipment,
    addGame,
    removeGame,
    addEquipment,
    removeEquipment,
    makeAnnouncement,
    getAnnouncements,
    getNoOfAnnouncements,
    deleteAnnouncement,
    updateTicket,
    getNoOfActiveTickets,
    getActiveTickets,
    getRecentEquipmentHistory,
    getEquipmentRecentHistoryDict,
    getNoOfEquipmentHistory,
    getEquipmentHistory
};