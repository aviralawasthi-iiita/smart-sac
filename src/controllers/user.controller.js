import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError}  from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { createEmailTransporter } from "../utils/mailtransporter.util.js"

import { Message } from "../models/message.model.js";
import { Ticket } from "../models/ticket.model.js";
import { Equipment } from "../models/equipment.model.js";
import { Game } from "../models/game.model.js";
import { Announcement } from "../models/announcement.model.js";
import { response } from "express"

const generateAccessTokenAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

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


const registerUser = asyncHandler(async(req,res) => {
    const {fullname,email,username,roll_no, password,phone_number} = req.body;
    console.log(email);
    if([fullname,email,username,password,phone_number].some((field)=>field?.trim() === "")){
        throw new ApiError(400,"all fields are required");
    }
    const existedUser = await User.findOne({
        $or:[{username},{email},{phone_number}]
    })
    if(existedUser){
        throw new ApiError(409,"user with email or username  or phone number already exist" );
    }
    const user = await User.create({
        fullname,
        email,
        password,
        roll_no,
        phone_number,
        username: username.toLowerCase()
    })
    const usercheck = await User.findById(user._id).select("-password -refreshToken");

    if(!usercheck){
        throw new ApiError(500,"user not created");
    }
    return res.status(201).json(
        new ApiResponse(200,usercheck,"User created succesfully")
    )

}); 

const loginUser = asyncHandler(async (req,res) => {
    const {email,username,password} = req.body;
    if(!(username || email)){
        throw new ApiError(400,"username or email is required");
    }
    const user = await User.findOne({
        $or: [{username},{email}]
    });

    if(!user){
        throw new ApiError(400,"user not found");
    }
    const ispassvalid = await user.isPasswordCorrect(password);

    if(!ispassvalid){
        throw new ApiError(401,"invalid password");
    }

   const {accessToken, refreshToken} = await generateAccessTokenAndRefreshTokens(user._id);

    const loggedinUser = await User.findById(user._id).select("-password -refreshToken" );

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", 
        sameSite: "strict", 
        };

    console.log("user logged in");
    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(
        200,
        {
            user:loggedinUser,accessToken,refreshToken
        },
        "user loggin in succesfully",
    ))
});


const logoutUser = asyncHandler(async(req,res)=> {
    await User.findByIdAndUpdate(req.user._id || req.body.user,
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
    .json({ message: "User logged out successfully" });;
});

const refreshAccessToken = asyncHandler(async(req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(500,"genrateing refrees gone wrong");
    }

    try {
        if (!process.env.REFRESH_TOKEN_SECRET) {
          throw new ApiError(500, "Server misconfiguration: missing REFRESH_TOKEN_SECRET");
        }
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await User.findById(decodedToken?._id);
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

        const {accessToken, refreshToken} = await generateAccessTokenAndRefreshTokens(user._id);
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(new ApiResponse(
            200,
            {
            accessToken,refreshToken
            },
            "user loggin in succesfully",
        ))
    } catch (error) {
        throw new ApiError(501, error?.message || "idkk)");
    }
})

const changeCurrentPassword = asyncHandler(async(req,res) =>{
    const {oldPassword,newPassword} = req.body;
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect) throw new ApiError(400,"invalid old password");
    user.password = newPassword;
    await user.save({validateBeforeSave:false});
    return res.status(200)
    .json(new ApiResponse(200,{},"pass cahnged"));
}
)

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Email is required");
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(401,"no user with the email");
  }

  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

  user.passwordResetToken = resetToken
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; 
  await user.save({ validateBeforeSave: false });

  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Password Reset Token</h1>
      <p>Hello ${user.fullname || 'User'},</p>
      <p>You requested a password reset. Please use the following token to reset your password:</p>
      
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #007bff;">
          ${resetToken}
        </div>
      </div>
      
      <p><strong>⏰ This token will expire in 10 minutes.</strong></p>
      <p>To reset your password:</p>
      <ol>
        <li>Copy the token above</li>
        <li>Go to the password reset page</li>
        <li>Paste the token in the token field</li>
        <li>Enter your new password</li>
      </ol>
      
      <p style="color: #666; margin-top: 30px;">If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">This is an automated email. Please do not reply.</p>
    </div>
  `;

  try {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: `"Smart-Sac" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Token',
      html: message
    })

    return res.status(200).json(
      new ApiResponse(
        200,
        {},
        "If an account exists with this email, a password reset token has been sent"
      )
    );
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.error("Email sending error:", error);
    throw new ApiError(500, "Error sending email. Please try again later.");
  }
});
 


const verifyResetToken = asyncHandler(async (req, res,next) => {
  const { token } = req.body;

  if (!token) {
    throw new ApiError(400, "Token is required");
  }

  const hashedToken = token

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }
  return res.status(200).json(
    new ApiResponse(200, { verified: true, token }, "Token verified successfully")
  );
});


const resetPassword = asyncHandler(async (req, res) => {
   const { token, newPassword, confirmPassword } = req.body;

  if (!token) {
    throw new ApiError(400, "Reset token is missing");
  }
  if (!newPassword || !confirmPassword) {
    throw new ApiError(400, "Token and passwords are required");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = undefined;

  await user.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {},
      "Password reset successful. Please login with your new password."
    )
  );
});


const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})
const updateAccountDetails = asyncHandler(async (req, res) => {
  const allowedFields = ["email", "phone_number", "fullname", "roll_no"];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] && req.body[field].toString().trim() !== "") {
      updates[field] = req.body[field].toString().trim();
    }
  }
    const games = req.body.games; 
  if (games) {
    if (!Array.isArray(games)) {
      throw new ApiError(400, "Games must be an array");
    }
    for (const g of games) {
      if (!g.name || g.rating === undefined) {
        throw new ApiError(400, "Each game must include both name and rating");
      }
      if (typeof g.rating !== "number" || g.rating < 0 || g.rating > 5) {
        throw new ApiError(400, "Game rating must be a number between 0 and 5");
      }
    }

    updates.games = games;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "At least one non-empty field is required to update");
  }

  if (updates.email) {
    const existingEmail = await User.findOne({
      email: updates.email.toLowerCase(),
      _id: { $ne: req.user._id },
    });
    if (existingEmail) throw new ApiError(409, "Email already in use");

    updates.email = updates.email.toLowerCase().trim();
  }

  if (updates.phone_number) {
    const existingPhone = await User.findOne({
      phone_number: updates.phone_number,
      _id: { $ne: req.user._id },
    });
    if (existingPhone) throw new ApiError(409, "Phone number already in use");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { ...updates, games } },
    { new: true }
  );

  
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const dashboardDetails = asyncHandler(async (req,res)=>{
  const user = req.user;
  if(!user) throw new ApiError(500, "no user found");

  const [
    numberOfUnreadMessages,
    numberOfOpenTickets,
    equipment,
    announcements
  ] = await Promise.all([
    Message.countDocuments({ receiver: user._id, status: { $nin: ["read","unsent"] }}),
    Ticket.countDocuments({ sender: user._id, status: "open" }),
    Equipment.find().lean(),
    Announcement.find().sort({ createdAt: -1 }).limit(2).lean()
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        unreadMessages: numberOfUnreadMessages,
        openTickets: numberOfOpenTickets,     
        equipment,  
        announcements  
      },
      "Dashboard details sent"
    )
  );
});


const searchUser = asyncHandler(async (req, res) => {
  const { query, gamesFilter } = req.body;
  if (!query) {
    throw new ApiError(400, "Please provide a search query ");
  }
  const filter = {};
  if (query) {
    filter.$or = [
      { fullname: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } }
    ];
  }

  if (gamesFilter) {
    filter["games.game"] = gamesFilter;
  }

  const users = await User.find(filter).select("fullname username email games");
 
    
  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});

const brokenEquipmentTicket = asyncHandler(async (req, res) => {
  const { equipment, heading, details } = req.body;
  const user = req.user;

  if (!equipment || !heading || !details) {
    throw new ApiError(400, "All fields (equipment, heading, details) are required");
  }
  if (!user) {
    throw new ApiError(401, "Unauthorized user");
  }

  const equipmentData = await Equipment.findOne({ name: equipment });
  if (!equipmentData) {
    throw new ApiError(404, "Equipment not found");
  }

  const ticket = await Ticket.create({
    heading,
    content: details,
    equipment: equipmentData._id,
    sender: user._id,
  });

  const message = `
    <h2>Broken Equipment Report</h2>
    <p><strong>Equipment:</strong> ${equipment}</p>
    <p><strong>Heading:</strong> ${heading}</p>
    <p><strong>Details:</strong> ${details}</p>
    <p><em>Reported by:</em> ${user.fullname || user.email}</p>
  `;

  try {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: `"Smart-Sac" <${process.env.EMAIL_USER}>`,
      to: process.env.SPORTS_HEAD_EMAIL,
      subject: "Broken Equipment Report",
      html: message,
    });

    res.status(200).json(
      new ApiResponse(200, { ticketId: ticket._id }, "Broken equipment report sent successfully")
    );
  } catch (error) {
    throw new ApiError(500, "Failed to send email");
  }
});


const newEquipmentTicket = asyncHandler(async (req, res) => {
  const { equipment, game, heading, details } = req.body;
  const user = req.user;

  if (!equipment || !game || !heading || !details) {
    throw new ApiError(400, "All fields (equipment, game, heading, details) are required");
  }
  if (!user) {
    throw new ApiError(401, "Unauthorized user");
  }

  const ticket = await Ticket.create({
    heading,
    content: details,
    sender: user._id,
  });

  const message = `
    <h2>New Equipment Request</h2>
    <p><strong>Game:</strong> ${game}</p>
    <p><strong>Equipment:</strong> ${equipment}</p>
    <p><strong>Heading:</strong> ${heading}</p>
    <p><strong>Details:</strong> ${details}</p>
    <p><em>Requested by:</em> ${user.fullname || user.email}</p>
  `;

  try {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: `"Smart-Sac" <${process.env.EMAIL_USER}>`,
      to: process.env.SPORTS_HEAD_EMAIL,
      subject: "New Equipment Request",
      html: message,
    });

    res.status(200).json(
      new ApiResponse(200, { ticketId: ticket._id }, "New equipment ticket sent successfully")
    );
  } catch (error) {
    throw new ApiError(500, "Failed to send email");
  }
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

export {registerUser,
    loginUser,
    logoutUser,
    updateAccountDetails,
    getCurrentUser,
    changeCurrentPassword,
    forgotPassword,
    verifyResetToken,
    refreshAccessToken,
    resetPassword,
    dashboardDetails,
    searchUser,
    brokenEquipmentTicket,
    newEquipmentTicket,
    getNoOfAnnouncements,
    getAnnouncements
};