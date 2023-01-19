const util = require("util");
const Cloud = require("@google-cloud/storage");
const { Storage } = Cloud;
const storage = new Storage({
  keyFilename: "./keys.json", // process.env.GCP_KEY_FILENAME
  projectId: "your project id",
});

const bucketPath = "guardians-assets-original/test"; // process.env.GCP_BUCKET_PATH
var slashIndex = bucketPath.indexOf("/");
var bucketName = bucketPath.substr(0, slashIndex);
var folderPath = bucketPath.substr(slashIndex + 1);
const bucket = storage.bucket(bucketName);

const uploadImage = (file) =>
  new Promise((resolve, reject) => {
    const { originalname, buffer } = file;

    const filename =
      encodeURI(folderPath + "/") + originalname.replace(/ /g, "_");
    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      resumable: false,
    });
    blobStream
      .on("finish", () => {
        const publicUrl = util.format(
          `https://storage.googleapis.com/${bucket.name}/${blob.name}`
        );
        resolve(publicUrl);
      })
      .on("error", (err) => {
        reject(`Unable to upload image, something went wrong`);
      })
      .end(buffer);
  });

module.exports = uploadImage;
