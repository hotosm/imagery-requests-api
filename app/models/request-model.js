import mongoose from 'mongoose';

const requestSchema = mongoose.Schema({
  authorId: String,
  name: String,
  status: String,

  requestingOrg: String,
  gsd: Number,
  productType: String,

  timePeriodRequested: {
    from: Date,
    to: Date
  },

  purpose: String,
  use: String,
  notes: String,

  created: Date,
  updated: Date
});

// Pre save hook to set updated and created dates.
requestSchema.pre('save', function (next) {
  var now = new Date();
  this.updated = now;
  if (!this.created) {
    this.created = now;
  }

  next();
});

// Create model from schema.
const requestModel = mongoose.model('request', requestSchema);

module.exports = requestModel;
