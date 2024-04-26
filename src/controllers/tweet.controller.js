import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;
  if (!content) throw new ApiError(400, "Content field required");

  const mytweet = await Tweet.create({
    owner: req.user?._id,
    content: content,
  });
  if (!mytweet) throw new ApiError(500, "Server Error");
  return res
    .status(200)
    .json(new ApiResponse(200, mytweet, "Tweet Created Successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId))
    throw new ApiError(400, "Invalid User ID");
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User Not found");
  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likeDetails",
        pipeline: [
          {
            $project: {
              likedBy: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likeDetails",
        },
        ownerDetails: {
          $first: "$ownerDetails",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [userId, "$ownerDetails.likedBy"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        ownerDetails: 1,
        likesCount: 1,
        createdAt: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!tweets) throw new ApiError(500, "Error while getting all tweets ");
  console.log(tweets);
  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "All Tweets Fetched Successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!content) throw new ApiError(400, "No Content Provided");
  if (!mongoose.Types.ObjectId.isValid(tweetId))
    throw new ApiError(400, "Invalid ID");
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(404, "Tweet not found");
  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "Only owner can edit their tweet");
  }
  const updatedtweet = await Tweet.findByIdAndUpdate(
    tweetId,
    { content },
    { new: true }
  );
  if (!updatedtweet) throw new ApiError(500, "Error while updating tweet!");
  return res
    .status(200)
    .json(new ApiResponse(200, updatedtweet, "Tweet Updated Successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(tweetId))
    throw new ApiError(400, "Invalid ID");
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(404, "Tweet Not Found");
  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "Only owner can edit their tweet");
  }
  const deletedTweet = await Tweet.deleteOne({ _id: tweetId });
  if (!deletedTweet)
    throw new ApiError(500, "Server error while deleting the tweet");
  return res
    .status(200)
    .json(new ApiResponse(200, deleteTweet, "Tweet Deleted Successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
