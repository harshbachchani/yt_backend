import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on clodinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded successfully
    fs.unlinkSync(localFilePath); //delete local copy of the image
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the locally saved temporary file
    // as the upload operation failed
    return null;
  }
};

function getimagepublicid(url) {
  const parts = url.split("/");
  const public_id_segment = parts[parts.indexOf("upload") + 2]; // Get the segment after 'upload'

  // Further split the segment to extract the actual public ID
  const public_id_parts = public_id_segment.split(".");
  const public_id = public_id_parts[0];

  console.log(public_id); // Output: p5dbvx6rdx5sp7szocxj
  return public_id;
}
const deletefromCloudinary = async (clodinaryfilePaths, resource_type) => {
  try {
    let paths = [];
    for (let x of clodinaryfilePaths) {
      console.log(x);
      paths.push(getimagepublicid(x));
    }
    // const public_id = getimagepublicid(clodinaryfilePath);
    const result = await cloudinary.api.delete_resources(paths, {
      resource_type: resource_type || "image",
    });
    return result;
  } catch (error) {
    console.log("Error in deleting Cloudinary Image ", error);
    return null;
  }
};
// cloudinary.uploader.upload(
//   "https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" },
//   function (error, result) {
//     console.log(result);
//   }
// );

export { uploadOnCloudinary, deletefromCloudinary };
