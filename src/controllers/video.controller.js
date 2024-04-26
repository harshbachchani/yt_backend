import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deletefromCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  const pipeline = [];
  if (!userId) throw new ApiError(400, "User Id is not provided");

  if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid User id");

  if (userId) {
    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
  if (query) {
    pipeline.push({
      $match: {
        title: {
          $regex: query,
          $options: options,
        },
      },
    });
  }

  pipeline.push({ $match: { isPublished: true } });

  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType == "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "ownerDetails",
    }
  );

  const videoaggregate = Video.aggregate(pipeline);
  const video = await Video.aggregatePaginate(videoaggregate, options);
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Videos Fetched Successfully"));
});
//

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  if (!(title && description)) {
    throw new ApiError(
      404,
      "Please provide a valid video title and decription"
    );
  }
  const videolocalpath = req.files?.videoFile[0]?.path;
  const thumbnaillocalpath = req.files?.thumbnail[0]?.path;
  if (!videolocalpath) {
    throw new ApiError(404, "Video File is missing");
  }
  if (!thumbnaillocalpath) {
    throw new ApiError(404, "Thumbnail File is missing");
  }
  const videofile = await uploadOnCloudinary(videolocalpath);
  const thumbnailfile = await uploadOnCloudinary(thumbnaillocalpath);
  if (!(videofile && thumbnailfile))
    throw new ApiError("501", "Cannot Upload files server error!!");

  const myvideo = await Video.create({
    title: title,
    description: description,
    videoFile: videofile.url,
    thumbNail: thumbnailfile.url,
    duration: videofile.duration,
    owner: req.user?._id,
  });
  if (!myvideo) throw new ApiError(500, "Internal Sever Error");
  return res
    .status(200)
    .json(new ApiResponse(200, myvideo, "Video Uploaded Successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(400, "No such video exists");
  const myvideo = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, $likes.likedBy] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        videoFile: 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        owner: 1,
        isLiked: 1,
        likesCount: 1,
        comments: 1,
      },
    },
  ]);
  if (!myvideo) {
    throw new ApiError(
      505,
      "Internal Server Error while fetching video details"
    );
  }
  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });
  return res
    .status(200)
    .json(new ApiResponse(200, myvideo, "Successfuly got the video!"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(videoId))
    throw new ApiError(404, "Invalid Video ID");
  //TODO: update video details like title, description, thumbnail
  const myvideo = await Video.findById(videoId);
  if (!myvideo) throw new ApiError(404, "This video does not exist");
  const thumbnaillocalpath = req.file?.path;
  const { title, description } = req.body;
  const update = {};
  let thumbnailfile = "";
  if (thumbnaillocalpath) {
    thumbnailfile = await uploadOnCloudinary(thumbnaillocalpath);
    if (!thumbnailfile.url)
      throw new ApiError(501, "Error while uploading avatar on cloud");
  }
  if (thumbnailfile !== "") update["thumbNail"] = thumbnailfile.url;
  if (title) update["title"] = title;
  if (description) update["description"] = description;
  if (Object.keys(update).length === 0)
    throw new ApiError(400, "Give atleast one of the parameters");
  const previouscloudinarypath = myvideo.thumbNail;
  const updatedvideo = await Video.findByIdAndUpdate(videoId, update, {
    new: true,
  });
  if (thumbnailfile !== "") {
    const result = await deletefromCloudinary([previouscloudinarypath]);
    console.log("File deleted from cloudinary ? ", result);
  }
  return res
    .status(200)
    .json(new ApiResponse(200, updatedvideo, "Updated Successfully!!"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  if (!mongoose.Types.ObjectId.isValid(videoId))
    throw new ApiError(404, "Invalid ID");

  const myvideo = await Video.findById(videoId);
  if (!myvideo) throw new ApiError(404, "No such video exists!");
  const thumbNailurl = myvideo.thumbNail;
  const videourl = myvideo.videoFile;
  const myresult = await Video.deleteOne({ _id: videoId });

  const resultimage = await deletefromCloudinary([thumbNailurl]);
  const resultvideo = await deletefromCloudinary([videourl], "video");
  console.log("Files removed successfully " + resultimage + "," + resultvideo);
  console.log(myresult);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) throw new ApiError(400, "Please provide a valid id");
  let myvideo = await Video.findById(videoId);
  if (!myvideo) throw new ApiError(404, "Video not found");
  const publishedstatus = myvideo.isPublished ^ true;
  const result = await Video.findByIdAndUpdate(
    videoId,
    { isPublished: publishedstatus },
    { new: true }
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Status Toggled successfully!!"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
