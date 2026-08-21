import { Router, Request, Response } from 'express';
import { sendTaskAssignmentEmail } from '../utils/email.js';

const router = Router();

/**
 * POST /api/email/task-notify
 * Send an email notification to a staff member about a newly assigned task.
 *
 * Body: { staffEmail, staffName, taskTitle, taskDescription, taskPriority, taskCategory, taskDueDate, assignedByName }
 */
router.post('/task-notify', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      staffId,
      staffEmail,
      staffName,
      taskTitle,
      taskDescription,
      taskPriority,
      taskCategory,
      taskDueDate,
      assignedByName,
    } = req.body;

    if (!staffEmail || !taskTitle) {
      res.status(400).json({ error: 'staffEmail and taskTitle are required' });
      return;
    }

    await sendTaskAssignmentEmail({
      staffId: staffId || '',
      staffEmail,
      staffName: staffName || 'Staff Member',
      taskTitle,
      taskDescription: taskDescription || '',
      taskPriority: taskPriority || 'medium',
      taskCategory: taskCategory || 'other',
      taskDueDate: taskDueDate || new Date().toISOString(),
      assignedByName: assignedByName || 'Admin',
    });

    res.json({ success: true, message: 'Task notification email sent' });
  } catch (error) {
    console.error('Failed to send task notification email:', error);
    res.status(500).json({ error: 'Failed to send email notification' });
  }
});

export default router;
