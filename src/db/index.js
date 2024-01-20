import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"

const connectDB = (async()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("Database connected successfully", connectionInstance.connection.host);
        // app.on("error",(error)=>{
        //     console.error("ERROR : ",error)
        //     throw error
        // })

        // app.listen(process.env.PORT,()=>{
        //     console.log(`App is listening on port ${process.env.PORT}`)
        // })
        
    } catch (error) {
        console.error("Database connection failed :",error);
        process.exit(1);
    }

})

export default connectDB