require("dotenv").config();
const Gallery = require("../models/Gallery");
const GalleryShare = require("../models/GalleryShared");
const cloudinary = require('cloudinary').v2;
const slugify = require("slugify");
const galleryShareController = require('./galleryShareController');

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
    const newGallery = new Gallery({
      ...req.body,
      name: finalName,
      slug: slug,
      userID: userId,
      path: cloudinaryResponse?.success ? cloudinaryResponse?.path : "",
      external_id: cloudinaryResponse?.success ? cloudinaryResponse?.external_id : "",
    });

    const gallery = await newGallery.save();
    req.body.galleryName = slug;
    req.body.can_read = true
    req.body.can_update = true
    req.body.can_delete = true
    req.body.can_add = true
    req.body.sharedUserEmailID = req.user.email
    await galleryShareController.addGallerySharingUser(req, res);
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

async function getImageCountByPrefix(prefix) {
  let count = 0;
  let nextCursor = null;
  console.log("aaaaaaaaa")
  do {
    const result = await cloudinary.api.resources({
      type: "upload",
      resource_type: "image",
      prefix: `${prefix}/`,
      max_results: 500,
      next_cursor: nextCursor,
    });
    console.log("resulttttttttt", result)
    count += result.resources.length;
    nextCursor = result.next_cursor;
  } while (nextCursor);

  return count;
}

const listGallery = async (req, res) => {
  try {
    const userID = req.user._id;
    const userEmail = req.user.email;

    // 1️⃣ Fetch galleries owned by the user
    const galleries = await Gallery.find({ userID }).sort({ _id: -1 });

    // 2️⃣ Fetch permissions for owned galleries
    const myGalleriesPermission = await GalleryShare.find({ sharedUserID: userID, userID: userID });
    const myGalleryPermissionLookup = {};
    myGalleriesPermission.forEach(p => {
      myGalleryPermissionLookup[p.galleryID.toString()] = p;
    });
    console.log("myGalleryPermissionLookup", myGalleryPermissionLookup)
    // 3️⃣ Fetch galleries shared with the user
    const sharedGalleryWithMe = await GalleryShare.find({ sharedUserEmailID: userEmail, userID: { $ne: userID } });
    const sharedGalleryIDs = sharedGalleryWithMe.map(item => item.galleryID);
    const sharedGalleries = await Gallery.find({ _id: { $in: sharedGalleryIDs } });

    // 4️⃣ Create lookup for shared permissions
    const sharedPermissionsLookup = {};
    sharedGalleryWithMe.forEach(s => {
      sharedPermissionsLookup[s.galleryID.toString()] = s;
    });

    // 5️⃣ Function to attach image count and permissions
    const attachImageCount = async (galleryArray, permissionLookup, isShared = false) => {
      return Promise.all(
        galleryArray.map(async (gallery) => {
          const count = await getImageCountByPrefix(gallery.path);

          const galleryObj = {
            ...gallery.toObject(),
            imageCount: count,
            sharedGallery: isShared
          };

          // Attach permissions if available
          const permissions = permissionLookup[gallery._id.toString()];
          if (permissions) {
            galleryObj.can_read = permissions.can_read;
            galleryObj.can_add = permissions.can_add;
            galleryObj.can_update = permissions.can_update;
            galleryObj.can_delete = permissions.can_delete;
            galleryObj.permissionID = permissions._id;
          } else if (!isShared) {

            galleryObj.can_read = true;
            galleryObj.can_add = true;
            galleryObj.can_update = true;
            galleryObj.can_delete = true;
          }

          return galleryObj;
        })
      );
    };

    // 6️⃣ Attach image counts and permissions
    const [result, sharedResult] = await Promise.all([
      attachImageCount(galleries, myGalleryPermissionLookup, false),
      attachImageCount(sharedGalleries, sharedPermissionsLookup, true)
    ]);

    res.json({ result, sharedResult });

  } catch (err) {
    console.error("Error in listGallery:", err);
    res.status(500).json({ message: err.message });
  }
};

const getGalleryWithPermission = async (req, res) => {
  try {
    const { permissionID } = req.body;

    if (!permissionID) {
      return res.status(400).json({ message: "permissionID is required" });
    }
    const permission = await GalleryShare.findById(permissionID);
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }
    const galleryObj = {
      ...req.body,
      can_read: permission.can_read,
      can_add: permission.can_add,
      can_update: permission.can_update,
      can_delete: permission.can_delete,
    };

    res.json({ success: true, data: galleryObj });
  } catch (err) {
    console.error("Error in getGalleryWithPermission:", err);
    res.status(500).json({ message: err.message });
  }
};

const getGallerySignatureBySlug = async (req, res) => {
  try {
    const folder = req.body.paramsToSign.folder;
    const uploadPreset = req.body.paramsToSign.upload_preset;
    const timestamp = req.body.paramsToSign.timestamp;
    console.log("bodydddd", req.body)
    const paramsToSign = {
      timestamp: timestamp,
      folder: folder,
      source: 'uw',
      upload_preset: uploadPreset,
    };
    //   console.log("paramsToSign",paramsToSign)
    var signature = cloudinary.utils.api_sign_request(req.body.paramsToSign, "PzgClgZEtEyYKMIpma-1yUQD5VQ");
    /// console.log("signature",signature)
    return res.json({ signature: signature, timestamp: timestamp, apikey: "827241192589495" }); // use `res.json()` not `Response.json()`


  } catch (error) {
    console.error("Error generating signature:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getImagesFromFolder = async (req, res) => {
  const userID = req.user._id;
  // Folder logic
  let folderPath = "";
  try {
    const galleryDetail = req.body.slug;

    if (!galleryDetail) {
      return res.status(400).json({ message: "Gallery detail is required" });
    }

    const slug = galleryDetail.slug;
    if (!slug) {
      return res.status(400).json({ message: "Gallery slug is required" });
    }


    if (galleryDetail.sharedGallery === false) {
      folderPath = `${userID.toString()}/${slug}`;
    } else {
      if (!galleryDetail.userID) {
        return res.status(400).json({ message: "UserID is required for shared gallery" });
      }
      folderPath = `${galleryDetail.userID.toString()}/${slug}`;
    }

    // Fetch all images
    const result = await cloudinary.search
      .expression(`folder:${folderPath} AND resource_type:image`)
      .sort_by("public_id", "desc")
      .max_results(500)
      .execute();

    // Add thumbnail URL to each resource
    const images = result.resources.map(img => {
      const original = img.secure_url;
      const thumbnail = original.replace(
        "/upload/",
        "/upload/w_300,h_300,c_fill/"
      );

      return {
        ...img,
        thumbnail_url: thumbnail
      };
    });
    console.log("images",images)
    res.status(200).json(images);

  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({ message: "Failed to fetch images", error: error.message });
  }
};



// const getImagesFromFolder = async (req, res) => {
//   const userID = req.user._id;
//   let folderPath = '';
//   try {
//     const galleryDetail = req.body.slug;
//     if (!galleryDetail) {
//       return res.status(400).json({ message: "Gallery detail is required" });
//     }

//     const slug = galleryDetail.slug;
//     if (!slug) {
//       return res.status(400).json({ message: "Gallery slug is required" });
//     }

//     if (galleryDetail.sharedGallery === false) {
//       folderPath = `${userID.toString()}/${slug}`;
//     } else {
//       if (!galleryDetail.userID) {
//         return res.status(400).json({ message: "UserID is required for shared gallery" });
//       }
//       folderPath = `${galleryDetail.userID.toString()}/${slug}`;
//     }
//     const result = await cloudinary.search
//       .expression(`folder:${folderPath} AND resource_type:image`)
//       .sort_by('public_id', 'desc')
//       .execute();

//     res.status(200).json(result.resources || []);

//   } catch (error) {
//     console.error("Error fetching images:", error);
//     res.status(500).json({ message: "Failed to fetch images", error: error.message });
//   }
// };

const deleteImagesFromCloudinary = async (req, res) => {
  try {
    const userID = req.user._id;
    const slug = req.body.slug
    const imageList = req.body.imageList
    const path = userID + "/" + slug
    const publicID = imageList.map(item => item.public_id);
    const response = await cloudinary.api.delete_resources(publicID, function (result) { console.log(result) });
    console.log("response delete", publicID, response)
  } catch (error) {
    console.error("Error fetching images:", error);
    throw error;
  }
}

module.exports = {
  listGallery,
  addGallery,
  getGalleryWithPermission,
  getGallerySignature,
  getGallerySignatureBySlug,
  getImagesFromFolder,
  deleteImagesFromCloudinary,
};
