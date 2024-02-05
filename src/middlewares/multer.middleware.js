import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      // console.log("file before saving to local storage: ",file)
      cb(null, "./public/tmp")
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
      // console.log("file after saving to local storage: ",file)
    }
  })

export const upload = multer({ 
    storage, 
})