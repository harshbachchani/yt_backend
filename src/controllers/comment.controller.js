import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId))
    throw new ApiError(400, "Invalid Video Id");
  const { page = 1, limit = 10 } = req.query;

  //first method
  // const myaggregate=Comment.aggregate();
  // const result=await Comment.aggregatePaginate(myaggregate,options);
  // const result = await Comment.aggregate().paginateExec({
  //   limit,
  //   page,
  //   sort: { createdAt: -1 },
  // }); //If you want to sort by in descending order according to createdAt

  const result = await Comment.aggregate([
    {
      match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owners",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owners",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [req.user?.id, "$likes.likedBy"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
  ]);

  if (!result) throw new ApiError(500, "Error while loading comment section");
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
  const comments = await Comment.aggregate(result, options);
  if (!comments) throw new ApiError(500, "Error while loading comment section");
  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Successfully fetched the comments"));
});
//
const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }
  if (!content) throw new ApiError(400, "Content is required");
  const mycomment = await Comment.create({
    content: content,
    video: videoId,
    owner: req.user?._id,
  });
  if (!mycomment) throw new ApiError(500, "Internal Server Error");
  return res
    .status(200)
    .json(new ApiResponse(200, mycomment, "Comment Added Succesfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;
  if (!content) throw new ApiError(400, "No Content Provided");
  if (!mongoose.Types.ObjectId.isValid(commentId))
    throw new ApiError(400, "Comment Id is invalid");
  const getcomment = await Comment.findById(commentId);
  if (!getcomment) throw new ApiError(400, "Comment not found");
  if (req.user?._id.toString() !== getcomment?.owner.toString()) {
    throw new ApiError(400, "User is not the owner of this comment");
  }
  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: content,
      },
    },
    { new: true }
  );
  if (!updatedComment) throw new ApiError(500, "Failed to update comment");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedComment,
        "Comment has been Updated Successfully"
      )
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId))
    throw new ApiError(400, "Comment Id is invalid");
  const getComment = await Comment.findById(commentId);
  if (!getComment) throw new ApiError(400, "Comment does not exist");
  if (req.user?._id.toString() !== getComment?.owner.toString()) {
    throw new ApiError(400, "User is not the owner of this comment");
  }
  const deletedComment = await Comment.deleteOne({ _id: commentId });
  if (!deletedComment) throw new ApiError(404, "No such comment found!");
  return res
    .status(200)
    .json(new ApiResponse(200, { id: commentId }, "Deleted Successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
