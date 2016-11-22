import Request from '../../app/models/request-model';
import Task from '../../app/models/task-model';

export function createTask (data) {
  return new Promise((resolve, reject) => {
    var task = new Task(data);
    task.addUpdate(data.authorId, 'open', 'Task was created');
    task.save((err, task) => {
      if (err) reject(err);
      else resolve(task);
    });
  });
}

export function createRequest (data) {
  return new Promise((resolve, reject) => {
    var request = new Request(data);
    request.save((err, request) => {
      if (err) reject(err);
      else resolve(request);
    });
  });
}

export function rid (no) {
  return '100000000000' + (100000000000 + no).toString();
}

export function tid (no) {
  return '900000000000' + (900000000000 + no).toString();
}