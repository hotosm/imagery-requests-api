import mongoose from 'mongoose';

const taskUpdateSchema = mongoose.Schema({
  authorId: String,
  status: String,
  comment: String,
  created: Date
});

const taskSchema = mongoose.Schema({
  authorId: String,
  requestId: mongoose.Schema.Types.ObjectId,
  assigneeId: String,

  name: String,
  geometry: [],

  deliveryTime: Date,

  timePeriodProvided: {
    from: Date,
    to: Date
  },

  updates: [taskUpdateSchema],

  created: Date,
  updated: Date
});

// Pre save hook to set updated and created dates.
taskSchema.pre('save', function (next) {
  var now = new Date();
  this.updated = now;
  if (!this.created) {
    this.created = now;
  }

  next();
});

taskSchema.methods.addUpdate = function (authorId, status, comment) {
  this.updates.push({
    authorId,
    status,
    comment,
    created: new Date()
  });

  return this;
};

// Create model from schema.
const taskModel = mongoose.model('task', taskSchema);

module.exports = taskModel;
