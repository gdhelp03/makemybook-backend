const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const stepFields = new mongoose.Schema({
  stepNumber: { type: Number, required: true },
  name: { type: String, required: true },
  status: { type: String },
  lastUpdatedTime: { type: String},
  lastUpdatedBy:  { type:  mongoose.Schema.Types.ObjectId,default:null},
})

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    invoice: {
      type: Number,
      required: false,
    },
    cart: [{}],
    user_info: {
      name: {
        type: String,
        required: false,
      },
      email: {
        type: String,
        required: false,
      },
      contact: {
        type: String,
        required: false,
      },
      address: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      country: {
        type: String,
        required: false,
      },
      zipCode: {
        type: String,
        required: false,
      },
    },
    subTotal: {
      type: Number,
      required: true,
    },
    shippingCost: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    shippingOption: {
      type: String,
      required: false,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    cardInfo: {
      type: Object,
      required: false,
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Delivered", "Cancel"],
    },
    gallery: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref:"Gallery",
    },
    selectedImageList: [{type: mongoose.Schema.Types.Mixed,    required: true,}],
    currentStep:{  type: Number, default:null},
    currentStepStatus:{type:String,default:null},
    steps: [stepFields],
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model(
  "Order",
  orderSchema.plugin(AutoIncrement, {
    inc_field: "invoice",
    start_seq: 10000,
  })
);
module.exports = Order;
