import Request from '../models/request-model';

export function attachRequestInfoToTask (task) {
  return Request.findById(task.requestId, {name: true})
    .then(request => {
      task = task.toObject();
      task.requestInfo = {name: request.name};
      return task;
    });
}
