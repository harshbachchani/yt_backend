import mongoose, { isValidObjectId, mongo } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if (!isValidObjectId(videoId)) throw new ApiError(404, "Invalid ID");

  const alreadyliked = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (alreadyliked) {
    await Like.findByIdAndDelete(alreadyliked._id);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isLiked: false },
          "Video Liked removed successfully"
        )
      );
  }
  const likedVideo = await Like.create({
    video: videoId,
    likedBy: req.user?._id,
  });
  if (!likedVideo)
    throw new ApiError(500, "Server Error while liking the video");

  return res
    .status(200)
    .json(new ApiResponse(200, likedVideo, "Video liked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!isValidObjectId(commentId))
    throw new ApiError(404, "Invalid Comment ID");

  const alreadyliked = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (alreadyliked) {
    await Like.findByIdAndDelete(alreadyliked._id);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isLiked: false },
          "Comment like removed successfully"
        )
      );
  }
  const likedComment = await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });
  if (!likedComment)
    throw new ApiError(500, "Server Error while liking the video");

  return res
    .status(200)
    .json(new ApiResponse(200, likedComment, "Video liked successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  if (!isValidObjectId(tweetId)) throw new ApiError(404, "Invalid Comment ID");

  const alreadyliked = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (alreadyliked) {
    await Like.findByIdAndDelete(alreadyliked._id);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isLiked: false },
          "Tweet like removed successfully"
        )
      );
  }
  const likedTweet = await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });
  if (!likedTweet)
    throw new ApiError(500, "Server Error while liking the video");

  return res
    .status(200)
    .json(new ApiResponse(200, likedTweet, "Video liked successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const userId = req.user?._id;
  if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid User Id");

  const likedvideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "owner",
              as: "ownerDetails",
            },
          },
          {
            $unwind: "$ownerDetails",
          },
        ],
      },
    },
    {
      $unwind: "$likedVideos",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        likedVideos: {
          _id: 1,
          owner: 1,
          videoFile: 1,
          thumbNail: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          isPublished: 1,
          ownerDetails: {
            username: 1,
            fullName: 1,
            avatar: 1,
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedvideos, "Liked Videos fetched Successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
