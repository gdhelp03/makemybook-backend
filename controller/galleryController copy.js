require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Gallery = require("../models/Gallery");
//const cloudinary = require('cloudinary');
const cloudinary = require('cloudinary').v2;
const slugify = require("slugify");

cloudinary.config({
  cloud_name: "dxbqvhtzo",
  api_key: "827241192589495",
  api_secret: "PzgClgZEtEyYKMIpma-1yUQD5VQ",
  signature_algorithm: 'sha256'
});


const addGallery = async (req, res) => {
  try {
    const userId = req.user._id;
    const baseName = req.body.name.trim();
    const regex = new RegExp(`^${baseName}(\\s\\d+)?$`, "i");

    const existingGalleries = await Gallery.find({
      userID: userId,
      name: { $regex: regex },
    });

    let finalName = baseName;

    if (existingGalleries.length > 0) {
      const suffixes = existingGalleries.map((g) => {
        const match = g.name.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });

      const maxSuffix = Math.max(...suffixes, 0);
      finalName = `${baseName} ${maxSuffix + 1}`;
    }
    const slug = slugify(finalName, { lower: true, strict: true });
    const cloudinaryResponse = await cloudinary.api.create_folder(`${userId}/${slug}`);
    //console.log("cloudinaryResponse",cloudinaryResponse)
    const newGallery = new Gallery({
      ...req.body,
      name: finalName,
      slug: slug,
      userID: userId,
      path: cloudinaryResponse?.success ? cloudinaryResponse?.path : "",
      external_id: cloudinaryResponse?.success ? cloudinaryResponse?.external_id : "",
    });

    const gallery = await newGallery.save();
    console.log("gallery", gallery)

    res.status(201).send(gallery);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
const getGallerySignature = async (req, res) => {
  try {
    const { folder = 'default' } = req.body;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET
    );
    const response = {
      signature,
      timestamp,
      folder,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    }
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: 'Signature generation failed', error: error.message });
  }
};
const listGallery = async (req, res) => {
  try {
    console.log("req.params.id", req.user._id, req.user)
    const gallery = await Gallery.find({ userID: req.user._id }).sort({ _id: -1 });
    res.send(gallery);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getGallerySignatureBySlug = async (req, res) => {
  try {
    const folder = req.body.paramsToSign.folder;
    const uploadPreset = req.body.paramsToSign.upload_preset;

    const timestamp =Math.round(new Date().getTime() / 1000) ;

    const paramsToSign = {
      timestamp: timestamp, 
      folder: folder,
      sources: ['local'],
      upload_preset: uploadPreset,
    };

    console.log("paramsToSign", paramsToSign);

    var signature = cloudinary.utils.api_sign_request({
    timestamp: timestamp,
    folder: folder,
    eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
    public_id: 'sample_image'}, "PzgClgZEtEyYKMIpma-1yUQD5VQ");


    // const signature = cloudinary.utils.api_sign_request(
    //   paramsToSign,
    //   process.env.CLOUDINARY_API_SECRET // use env variable instead of hardcoding
    // );

    console.log("Signature:", signature);

    // ✅ Proper way to send response in Express
    return res.json({signature: signature, timestamp: timestamp, apikey:"827241192589495" }); // use `res.json()` not `Response.json()`

// const cloudinary = require('cloudinary').v2 
// app.post('/api/sign-upload', (req, res) => { 
//   const timestamp = Math.round(new Date().getTime() / 1000) 
//   const paramsToSign = { timestamp: timestamp, folder: req.body.folder || 'signed_upload_demo' } 
//   const signature = cloudinary.utils.api_sign_request( paramsToSign, process.env.CLOUDINARY_API_SECRET ) 
//   res.json({ signature: signature, timestamp: timestamp, apikey: process.env.CLOUDINARY_API_KEY }) })

  } catch (error) {
    console.error("Error generating signature:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


const getGallerySignatureBySlugold2 = async (req, res) => {
  const folder = req.body.paramsToSign.folder
  const uploadPreset = req.body.paramsToSign.upload_preset
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    timestamp: timestamp,
    folder: folder,
    sources: ['local'],
    upload_preset: uploadPreset
  }
  console.log("paramsToSign", paramsToSign)

  // {
  //   const body = await request.json();
  //   const { paramsToSign } = body;
  //   const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);
  //   return Response.json({ signature });
  // }





  const signature = cloudinary.utils.api_sign_request(paramsToSign, "PzgClgZEtEyYKMIpma-1yUQD5VQ");
  // const response = {
  //   signature
  // }
  console.log(signature)

  return Response.json({ signature });
 // return res.status(200).json(response);
}


const getGallerySignatureBySlugold = async (req, res) => {
  try {
    console.log("gallery signature body")
    console.log(req.body)
    // const userID = req.user._id;
    // const slug = "default"; //req.body.slug;
    // if (!userID || !slug) {
    //   return res.status(400).json({ message: "Missing userID or slug" });
    // }

    // const existingGallery = await Gallery.findOne({
    //   userID,
    //   slug,
    // });

    // if (!existingGallery || !existingGallery.path) {
    //   return res.status(404).json({ message: "Gallery not found or missing path" });
    // }

    // const path = existingGallery.path;
    // const timestamp = Math.floor(Date.now() / 1000);
    // // const signature = cloudinary.utils.api_sign_request(
    // //   { timestamp, folder: path },
    // //   process.env.CLOUDINARY_API_SECRET
    // // );

    // const signature = cloudinary.utils.api_sign_request(
    //   { timestamp },
    //   process.env.CLOUDINARY_API_SECRET
    // );

    // const response = {
    //   signature,
    //   timestamp,
    //   path,
    //   apiKey: process.env.CLOUDINARY_API_KEY,
    //   cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    // };
    //    return res.status(200).json({
    //   timestamp,
    //   signature,
    // });

    //  res.status(200).json(response);
  } catch (error) {
    console.error("Signature generation error:", error);
    res.status(500).json({
      message: "Signature generation failed",
      error: error.message || "Unknown error",
    });
  }
};



module.exports = {
  listGallery,
  addGallery,
  getGallerySignature,
  getGallerySignatureBySlug,
};
