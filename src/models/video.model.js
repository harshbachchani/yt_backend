import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema = new Schema(
  {
    videoFile: {
      type: String, //cloudinary url
      required: [true, "Video Field is required"],
    },
    thumbNail: {
      type: String,
      required: [true, "ThumbNail Field is required"],
    },
    title: {
      type: String,
      required: [true, "Title Field is required"],
    },
    description: {
      type: String,
      required: [true, "Description Field is required"],
    },
    duration: {
      //
      type: Number, //cloudinary  url
      required: [true, "Video Field is required"],
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);
export const Video = mongoose.model("Video", videoSchema);
