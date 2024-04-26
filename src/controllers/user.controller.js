import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deletefromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
const generateAccessandRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accesstoken = await user.generateAcessToken();
    const refreshtoken = await user.generateRefreshToken();

    user.refreshToken = refreshtoken;
    await user.save({ validateBeforeSave: false });
    return { accesstoken, refreshtoken };
  } catch (err) {
    throw new ApiError(
      500,
      "Something Went Wrong while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get user details from front end
  //Validation - not empty
  //check if user already exists - username and email
  //check for images,check for avatar
  //upload them cloudinary,avatar
  //create user object -- create entry in db
  //remove password and refresh token field from resopnse
  //check for user creation
  //return res

  const { fullname, email, username, password } = req.body;

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with this username or email already exist");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0].path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(409, "Avatar file is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  // console.log(avatar);
  if (!avatar) {
    throw new ApiError(409, "Avatar file is required");
  }

  const myuser = await User.create({
    fullname: fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email: email,
    password: password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(myuser._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(
      500,
      "Something Went Wrong while registering the user!!"
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //take data from req body
  //username or email
  //find the user
  //check password
  //access and refresh token
  //send cookie
  // console.log(req.body);
  const { email, username, password } = req.body;

  if (!(username || email)) {
    console.log(username);
    console.log(email);
    console.log(password);
    throw new ApiError(400, "username or email is required");
  }

  const myuser = await User.findOne({
    $or: [{ username }, { email }],
  });

  // console.log(myuser);
  if (!myuser) {
    throw new ApiError(404, "user does not exist");
  }

  const ispasswordmatch = await myuser.isPassWordCorrect(password);
  if (!ispasswordmatch) throw new ApiError(403, "Invalid User Credentials");
  // console.log(ispasswordmatch);
  const { accesstoken, refreshtoken } = await generateAccessandRefreshToken(
    myuser._id
  );
  // console.log(accesstoken);
  // console.log(refreshtoken);
  // console.log(myuser._id);
  const loggedInUser = await User.findById(myuser._id).select(
    "-password -refreshToken"
  );

  // console.log(loggedInUser);

  const options = {
    httpOnly: true,
    secure: true,
  };
  console.log(accesstoken);
  console.log(refreshtoken);
  return res
    .status(200)
    .cookie("accessToken", accesstoken, options)
    .cookie("refreshToken", refreshtoken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accesstoken,
          refreshtoken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, //this removes the field from document
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out Successfully"));
});

const refreshAcessToken = asyncHandler(async (req, res) => {
  const incomingrefreshtoken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingrefreshtoken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedtoken = await jwt.verify(
      incomingrefreshtoken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const myuser = await User.findById(decodedtoken?._id);
    if (!myuser) throw new ApiError(401, "Invalid Refresh Token");
    if (incomingrefreshtoken !== myuser.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accesstoken, newrefreshtoken } =
      await generateAccessandRefreshToken(myuser._id);
    return res
      .status(200)
      .cookie("accessToken", accesstoken, options)
      .cookie("refreshToken", newrefreshtoken, options)
      .json(
        new ApiResponse(
          200,
          { accesstoken, refreshToken: newrefreshtoken },
          "Access Token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const ispasswordmatch = await user.isPassWordCorrect(oldPassword);
  if (!ispasswordmatch) {
    throw new ApiError(401, "Invalid Old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current User fetched successfully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) throw new ApiError(401, "All Fields are required");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select(" -password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Details Uploaded Successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) throw new ApiError(400, "Avatar File is missing");

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url)
    throw new ApiError(501, "Error while uploading avatar on cloud");
  const avatarpreviouscloudinaryPath = req.user?.avatar;
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");
  // Remove clodinary previous file
  const result = await deletefromCloudinary([avatarpreviouscloudinaryPath]);
  console.log(`Image removed from Cloudinary ${result}`);
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Image updated Successfully"));
});

const updateUsercoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath)
    throw new ApiError(400, "Cover Image File is missing");

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  const coverImagepreviouscloudinaryPath = req.user?.coverImage;
  if (!coverImage.url)
    throw new ApiError(501, "Error while uploading cover Image on cloud");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");
  const result = await deletefromCloudinary([coverImagepreviouscloudinaryPath]);
  console.log(`Image removed from Cloudinary ${result}`);
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated Successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelDubscibedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelDubscibedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel not found");
  }

  console.log(channel);

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User Channel Fetched Successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  console.log(user);
  return res
    .status(200)
    .json(new ApiResponse(200, user[0], "Watch History Fetched Successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAcessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUsercoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
