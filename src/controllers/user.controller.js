import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError}  from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { application } from "express"
import { mongo } from "mongoose"
import mongoose from "mongoose"

const generateAccessTokenAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error while generating tokens");
  }
};


const registerUser = asyncHandler(async(req,res) => {
    const {fullname, email,username,password} = req.body;
    console.log(email);
    if([fullname,email,username,password].some((field)=>field?.trim() === "")){
        throw new ApiError(400,"all fields are required");
    }
    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"user with email or username already exist" );
    }
    console.log(req.files);
    const avatarLocalPath = req.files?.avatar[0].path;
    // const coverImagePath = req.files?.coverImage[0]?.path;

    let coverImagePath;
    if(  req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImagePath = req.files.coverImage[0].path;
    }
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar fle is required 1");
    }
    console.log(avatarLocalPath);

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImagePath);
    if(!avatar){
        throw new ApiError(400,"Avatar fle is required 2");
    }
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const usercheck = await User.findById(user._id).select("-password -refreshToken");

    if(!usercheck){
        throw new ApiError(500,"user not created");
    }
    return res.status(201).json(
        new ApiResponse(200,usercheck),"User created succesfully"
    )

});

const loginUser = asyncHandler(async (req,res) => {
    const {email,username,password} = req.body;
    if(!username || !email){
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

    const {acesstoken,refreshtoken}  = await generateAccessTokenAndRefreshTokens(user._id);

    const loggedinUser = await User.findById(user._id).select("-password -refreshToken" );

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // ✅ only secure in prod
        sameSite: "strict", // optional but recommended
        };

    console.log("user logged in");
    return res.status(200)
    .cookie("accessToken",acesstoken,options)
    .cookie("refreshToken",refreshtoken,options)
    .json(new ApiResponse(
        200,
        {
            user:loggedinUser,acesstoken,refreshtoken
        },
        "user loggin in succesfully",
    ))
});


const logoutUser = asyncHandler(async(req,res)=> {
    await User.findByIdAndUpdate(req.user._id,
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
        secure: process.env.NODE_ENV === "production", // ✅ only secure in prod
        sameSite: "strict", // optional but recommended
        };


    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json({ message: "User logged out successfully" });;
});

const refreshAccessToken = asyncHandler(async(req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.resfreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(500,"genrateing refrees gone wrong");
    }

    try {
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
            secure: process.env.NODE_ENV === "production", // ✅ only secure in prod
            sameSite: "strict", // optional but recommended
            };
        const {acesstoken,nrefreshtoken} =  await generateAccessTokenAndRefreshTokens(User._id);
        return res.status(200)
        .cookie("accessToken",acesstoken,options)
        .cookie("refreshToken",nrefreshtoken,options)
        .json(new ApiResponse(
            200,
            {
                user:loggedinUser,acesstoken,nrefreshtoken
            },
            "user loggin in succesfully",
        ))
    } catch (error) {
        throw new ApiError(5001, error?.message || "idkk)");
    }
})

const changeCurrentPassword = asyncHandler(async(req,res) =>{
    const {oldPassword,newPassword} = req.body;
    const user = await User.findById(req.user?.id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect) throw new ApiError(400,"invalid old password");
    user.password = newPassword;
    await user.save({validateBeforeSave:false});
    return res.status(200)
    .json(new ApiResponse(200,{},"pass cahnged"));
}
)

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(200,req.user,"current user fetched");
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullname,email} = req.body;
    if(!fullname || !email){
        throw new ApiError(400,"all field are required");
    }
    const user = User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullnName: fullname,
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

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarlocalpath = req.file?.path;
    if(!avatarlocalpath) throw new ApiError(400,"avatar file is missing");
    if(!avatar.url){
        throw new ApiError(400,"erroe on uploading avatar");
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")
    return res
    .status(200)
    .json(200,user,"avatar uploaded");
})


const updateUsercoverimage = asyncHandler(async(req,res)=>{
    const avatarlocalpath = req.file?.path;
    if(!avatarlocalpath) throw new ApiError(400,"avatar file is missing");
    if(!avatar.url){
        throw new ApiError(400,"erroe on uploading coverimage");
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage:avatar.url
            }
        },
        {new:true}
    ).select("-password");
    return res
    .status(200)
    .json(200,user,"cover image done");
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params;

    if (!username?.trim()) {
        throw new ApiError(400,"username is missing");
    }
    const channel = await User.aggregate([
        {
            $match:{
                username:username.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size: "$subscribers"
                },
                channelsSubscibedToCount:{
                    $size: "subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false,
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscriberCount:1,
                isSubscribed,
                avatar:1,
                channelsSubscibedToCount:1,
                email:1
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404,"channel not exist");
    }
    return res.status(200)
    .json(
        new ApiResponse(200,channel[0],"user channel fetchd successfully")
    );
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField:"watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                             foreignField: "_id",
                             as: "owner",
                             pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1,
                                    }
                                }
                             ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);
    return res
    .status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory,"watch history fetched")
    )
})

export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updateAccountDetails,
    getCurrentUser,
    updateUserAvatar,
    updateUsercoverimage,
    getUserChannelProfile,
    getWatchHistory,
    changeCurrentPassword

};