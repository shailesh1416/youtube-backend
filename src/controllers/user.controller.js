import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async(req,res)=>{
    // Get user details from frontend
    // validation - not empty
    // check if user already exist? - user, email
    // check for image, check for avatar
    // upload image to cloudinary
    // save user object
    // remove password and refreshtoken from response
    // check for user creation
    // return response

    const {fullname, email, username, password} = req.body

    if([fullname,email,password,username].some((field)=>{
        field?.trim()===""
    })){
        throw new ApiError(400, "All Fields are required")
    }

    const existedUser = await User.findOne({
        $or:[{email}, {username}]
    })

    if (existedUser){
        throw new ApiError(409,"User with email or username already exist")
    }

    // console.log("Files in request : ", req.files)
    const avatarLocalfile = req.files?.avatar[0]?.path;
    // const coverLocalfile = req.files?.coverImage[0]?.path;

    let coverLocalfile;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverLocalfile = req.files.coverImage[0].path
    }

    
    if(!avatarLocalfile){
        throw new ApiError(400, "Avatar file is required")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalfile)
    const coverImage = await uploadOnCloudinary(coverLocalfile)
    
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }
    

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

});

export {registerUser}