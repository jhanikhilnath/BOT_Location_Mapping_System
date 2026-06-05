import express from 'express';

import scanPackageRouter from './router/scanPackageRouter.js';
import locationRouter from './router/locationRouter.js';
import globalErrorHandler from './controller/errorController.js';
import logsRouter from './router/logsRouter.js';

import AppError from './utils/appError.js';

const app = express();

app.use(express.json());

app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'All systms working!!',
  });
});

app.use('/api/logs', logsRouter);

app.use('/api/scanPackage', scanPackageRouter);

app.use('/api/location', locationRouter);

app.all('{*splat}', (req, res, next) => {
  throw new AppError('Page Not Found', 404);
});

app.use(globalErrorHandler);

export default app;
