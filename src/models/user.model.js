import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true, //for enabling searching field in  MongoDB
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: [true, "FullName is required"],
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //cloudinary image url
      required: [true, "Image is required"],
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

//In MongoDB, "hooks" typically refer to mechanisms or functionalities that allow developers
// to execute custom code or perform actions at certain points in the lifecycle of a MongoDB
// operation. Hooks are like middle ware
//mongodb provide two most important hooks pre and post
//as the name suggest pre hook executed just before the data is save in mongodb
//and post hook is executed just after the data is saved in mongodb

//we don't use arrow function while using hooks because as we know that we don't have
//access to this in arrow functions
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//we can use methods object to add user defined methods also and we can use them everywhere
//while using that particular schema

userSchema.methods.isPassWordCorrect = async function (password) {
  //the bcrypt.compare method compare the original string with the encypted password
  //and return if they are equal or not
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAcessToken = async function () {
  return await jwt.sign(
    {
      _id: this._id,
      email: this.email,
      fullname: this.fullname,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = async function () {
  return await jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};
export const User = mongoose.model("User", userSchema);
