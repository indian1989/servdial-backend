// backend/models/Lead.js

import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
{
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
    index: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  phone: {
    type: String,
    required: true
  },

  email: {
    type: String,
    default: ""
  },

  message: {
    type: String,
    default: ""
  },

  cityId:{
  type: mongoose.Schema.Types.ObjectId,
  ref:"City",
  index:true
},

// optional snapshot
cityName: {
  type: String,
},

  // Lead source tracking
  source: {
    type: String,
    enum: ["form", "phone", "whatsapp", "chat"],
    default: "form"
  },

  bookingType:{
 type:String,
 enum:[
 "table_booking",
 "room_booking",
 "service_booking",
 "appointment"
 ]
},

bookingDate:String,

bookingTime:String,

guests:Number,

service:String,

  // Lead lifecycle
  status: {
    type: String,
    enum: ["new", "contacted", "converted", "closed"],
    default: "new",
    index: true
  }

},
{
  timestamps: true
}
);

leadSchema.pre("save", function(next){

 if(this.phone){
   this.phone=this.phone.replace(/\D/g,"");
 }

 next();

});


// ================= INDEXES =================

// Faster provider dashboard queries
leadSchema.index({ business: 1, createdAt: -1 });

export default mongoose.model("Lead", leadSchema);