import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  //TODO: create playlist
  if (!(name && description))
    throw new ApiError(404, "All Fields are required");
  const myplaylist = Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });
  if (!myplaylist)
    throw new ApiError(500, "Server error while creating playlist");
  return res
    .status(200)
    .json(new ApiResponse(200, myplaylist, "Playlist Created Successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid User Id");

  const playlist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "MyVideos",
      },
    },
    {
      $addFields: {
        totalVideos: {
          $size: "$MyVideos",
        },
        totalViews: {
          $sum: "$MyVideos.views",
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        desciption: 1,
        totalVideos: 1,
        totalViews: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (!playlist) {
    throw new ApiError(500, "Server error while finding the playlist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "User Playlist fetched Successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid Playlist Id");

  const playlist = Playlist.findById(playlistId);
  if (!playlist) throw new ApiError(400, "Playlist not found");

  const playlistVideos = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "MyVideos",
      },
    },
    {
      $match: {
        "MyVideos.isPublished": true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetail",
      },
    },
    {
      $addFields: {
        totalVideos: {
          $size: "$MyVideos",
        },
        totalViews: {
          $sum: "$MyVideos.views",
        },
        owner: {
          $first: "$ownerDetail",
        },
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        totalVideos: 1,
        totalViews: 1,
        MyVideos: {
          _id: 1,
          thumbnail: 1,
          videoFile: 1,
          title: 1,
          desciption: 1,
          createdAt: 1,
          duration: 1,
          views: 1,
        },
        owner: {
          username: 1,
          fullName: 1,
          avatar: 1,
        },
      },
    },
  ]);

  if (!playlistVideos) {
    throw new ApiError(500, "Server error while aggregating playlist videos");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, playlistVideos, "Playlist Fetched Successfully")
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!(isValidObjectId(playlistId) && isValidObjectId(videoId)))
    throw new ApiError(400, "Provide valid playlist and video id");
  const video = await Video.findById(videoId);
  const playlist = await Playlist.findById(playlistId);
  if (!video) throw new ApiError(400, "Video not found");
  if (!playlist) throw new ApiError(400, "Playlist not found");

  if (
    (playlist.owner?.toString() && video.owner.toString()) !== req.user?._id
  ) {
    throw new ApiError(400, "only owner can add video to their playlist");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: {
        videos: videoId,
      },
    },
    { new: true }
  );

  if (!updatedPlaylist)
    throw new ApiError(500, "Error while adding video to the playlist");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video added successfully to the playlist"
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
  if (!(isValidObjectId(playlistId) && isValidObjectId(videoId)))
    throw new ApiError(400, "Provide valid playlist and video id");
  const video = await Video.findById(videoId);
  const playlist = await Playlist.findById(playlistId);
  if (!video) throw new ApiError(400, "Video not found");
  if (!playlist) throw new ApiError(400, "Playlist not found");

  if (
    (playlist.owner?.toString() && video.owner.toString()) !== req.user?._id
  ) {
    throw new ApiError(400, "only owner can remove video from their playlist");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        videos: videoId,
      },
    },
    { new: true }
  );

  if (!updatedPlaylist)
    throw new ApiError(500, "Error while removing the video from playlist");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video removed successfully from the playlist"
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Provide valid playlist id");

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) throw new ApiError(400, "Playlist not found");

  if (playlist.owner?.toString() !== req.user?._id) {
    throw new ApiError(400, "You are not authorized to delete the playlist");
  }

  const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

  if (!deletedPlaylist)
    throw new ApiError(500, "Error while deleting playlist");
  return res
    .status(200)
    .json(
      new ApiResponse(200, deletePlaylist, "Playlist deleted successfully")
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
  //TODO: update playlist
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!(name && description)) {
    throw new ApiError(400, "All fields are required , name and description");
  }

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist Id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(400, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "Only owner can edit the playlist");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    { new: true }
  );

  if (!updatedPlaylist) {
    throw new ApiError(500, "Server error while updating the playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
