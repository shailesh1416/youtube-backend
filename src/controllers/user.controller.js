import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessTokenAndRefreshToken= async(userId)=>{
    try {
        const user = await User.findById(userId)
        // console.log(user)
        const accessToken =  user.generateAccessToken()
        const refreshToken =  user.generateRefreshToken()

        // console.log("accesstoken :",accessToken)
        // console.log("refresh token :",refreshToken)

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating Refresh token or Access token")
    }
}


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

const loginUser = asyncHandler(async(req,res)=>{
    // get username and password from frontend
    // validate username and password
    // check if username exist
    // check if user already logged in
    // if user exist -> check if password matches correctly
    // if username and password are correct -> generate access tocken and refresah token for user
    // send response  to frontend

    const {username, password,email} = req.body

    if (!(username ||  email)) {
        throw new ApiError(400, "Username or Email is required")
    }

  
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    // console.log("user found: ",user)

    if(!user){
        throw new ApiError(404, "Invalid user credentials")
    }


    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(404, "Invalid user credentials")
    }

    const {accessToken, refreshToken}= await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-refreshToken -password")
    const options = {
        httpOnly: true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        200,
        {
            user:loggedInUser, accessToken,refreshToken
        },
        "User logged in successfully"
    )
});

const logoutUser = asyncHandler(async (req,res)=>{
    User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken : undefined
        }
    },
    {
        new:true
    }
    )

    const options = {
        httpOnly: true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incommingRefreshToken) {
        throw new ApiError(401,"Unauthorised request")
    }
    try {
        
            const decodedToken = jwt.verify(
                incommingRefreshToken, 
                process.env.REFRESH_TOKEN_SECRET
            )
        
            const user = await User.findById(decodedToken?._id)
        
            if (!user) {
                throw new ApiError(401,"Invalid refresh token")
            }
        
            if(incommingRefreshToken !== user?.refreshToken){
                throw new ApiError(401,"Refresh token is exired or used")
            }
        
            const options= {
                httpOnly: true,
                secure: true
            }
        
        
            const {accessToken, newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id, options)
        
            return res.
            status(200)
            .cookie("accessToken", accessToken)
            .cookie("refreshToken", newRefreshToken)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken:newRefreshToken
                    },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }


})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400,"Invalid old password")
    }

    user.password = newPassword
    user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, "Password changes successfully"))

})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,  req.user, "Current value feched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname, email} = req.body

    if(!fullname || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email:email
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully") )

})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400,"Error while uploading avatar to cloudinary")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json( new ApiResponse(200,user, "Avatar updated successfully"))


})


const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400,"coverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400,"Error while uploading coverImage to cloudinary")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json( new ApiResponse(200,user, "coverImage updated successfully"))

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}