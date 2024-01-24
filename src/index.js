import dotenv from "dotenv"
import connectDB from "./db/index.js"
import {app} from './app.js'

/*
import mongoose from "mongoose";
import {DB_NAME} from "./constants.js"
import express from "express";
*/

dotenv.config({
    path:'./env'
})

connectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.error("ERROR : ",error)
        throw error
    })
    app.listen(process.env.PORT|| 8000,()=>{
        console.log(` Server is running at port :${process.env.PORT}`)
    })

})
.catch((err)=>{
    console.log("MongoDB connection failed!!!",err)
})




/*
const app = express()

;(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("Database connected successfully")
        app.on("error",(error)=>{
            console.error("ERROR : ",error)
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })
        
    } catch (error) {
        console.error("Database connection failed :",error);
        throw error
    }

})();

*/