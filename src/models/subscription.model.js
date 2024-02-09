import mongoose,{Schema} from "mongoose";


const subscriptionSchema = Schema({
    subscriber:{
        type: Schema.Types.ObjectId, // One who is subscribing
        ref: "User"
    },
    channel:{
        type: Schema.Types.ObjectId, // channel being subscribed
        ref: "User"
    }
},{timestamps: true})


export const Subscription = mongoose.model("Subscription", subscriptionSchema)