import cloudinary from "../config/cloudinary.js";

export const uploadImage = async (fileBuffer) => {

  return new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      { folder: "servdial" },
      (error, result) => {

        if (result) resolve(result);
        else reject(error);

      }
    );

    stream.end(fileBuffer);

  });

};