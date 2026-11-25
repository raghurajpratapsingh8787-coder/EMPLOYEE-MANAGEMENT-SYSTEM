import { Department } from '../models/Department';
import { Designation } from '../models/Designation';
import { Employee } from '../models/Employee';
import { Attendance } from '../models/Attendance';
import { LeaveBalance } from '../models/LeaveBalance';
import { LeaveRequest } from '../models/LeaveRequest';
import { Payroll } from '../models/Payroll';
import { PerformanceReview } from '../models/PerformanceReview';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { calculatePayroll } from '../utils/payrollCalculator';

function formatDateOffset(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export async function seedEnterpriseWorkspace(params: {
  adminUserId: string;
  adminFullName: string;
  adminEmail: string;
}): Promise<void> {
  const existingDepts = await Department.countDocuments();
  if (existingDepts > 0) {
    return;
  }

  // 1. Departments
  const [engDept, peopleDept, financeDept, designDept, productDept, opsDept] = await Department.create([
    {
      name: 'Engineering',
      code: 'ENG',
      description: 'Core platform architecture, backend systems, and cloud infrastructure.',
    },
    {
      name: 'People Operations',
      code: 'PPL',
      description: 'Talent acquisition, employee experience, compensation, and compliance.',
    },
    {
      name: 'Finance & Payroll',
      code: 'FIN',
      description: 'Corporate accounting, treasury, payroll administration, and FP&A.',
    },
    {
      name: 'Product Design',
      code: 'DES',
      description: 'Design systems, user research, and enterprise interface craft.',
    },
    {
      name: 'Product Management',
      code: 'PRD',
      description: 'Roadmap strategy, enterprise customer discovery, and release planning.',
    },
    {
      name: 'Revenue Operations',
      code: 'OPS',
      description: 'Enterprise customer success, systems automation, and analytics.',
    },
  ]);

  // 2. Designations
  const [
    vpPeople,
    hrDirector,
    staffArchitect,
    seniorEng,
    frontendEng,
    payrollLead,
    designLead,
    productMgr,
    revOpsAnalyst,
    qaLead,
  ] = await Designation.create([
    { name: 'VP of People Operations', level: 9, departmentId: peopleDept._id },
    { name: 'HR Director', level: 7, departmentId: peopleDept._id },
    { name: 'Staff Software Architect', level: 8, departmentId: engDept._id },
    { name: 'Senior Backend Engineer', level: 6, departmentId: engDept._id },
    { name: 'Frontend Systems Engineer', level: 5, departmentId: engDept._id },
    { name: 'Finance & Payroll Lead', level: 7, departmentId: financeDept._id },
    { name: 'Product Design Lead', level: 7, departmentId: designDept._id },
    { name: 'Senior Product Manager', level: 6, departmentId: productDept._id },
    { name: 'Revenue Operations Analyst', level: 4, departmentId: opsDept._id },
    { name: 'Quality Engineering Lead', level: 6, departmentId: engDept._id },
  ]);

  const currentMonth = new Date().getUTCMonth() + 1;
  const currentYear = new Date().getUTCFullYear();
  const nextWeekBday = new Date();
  nextWeekBday.setUTCDate(nextWeekBday.getUTCDate() + 4);
  const bdayMonthDay = nextWeekBday.toISOString().slice(5, 10);

  const bday2 = new Date();
  bday2.setUTCDate(bday2.getUTCDate() + 9);
  const bday2MonthDay = bday2.toISOString().slice(5, 10);

  // 3. Employees (referencing our generated studio headshot portraits)
  const isDefaultSarah = (params.adminFullName || '').trim().toLowerCase() === 'sarah chen';
  const sarah = await Employee.create({
    employeeId: 'EMP-1001',
    fullName: params.adminFullName || 'Sarah Chen',
    avatarUrl: isDefaultSarah ? '/src/assets/images/avatar_sarah_chen_1795588297738.jpg' : undefined,
    email: params.adminEmail,
    phone: '+1 (415) 890-2104',
    gender: isDefaultSarah ? 'Female' : 'Prefer not to say',
    dateOfBirth: '1988-04-12',
    address: '450 Mission Street, Suite 400',
    city: 'San Francisco',
    state: 'CA',
    departmentId: peopleDept._id,
    designationId: vpPeople._id,
    joiningDate: '2023-02-15',
    employmentType: 'FULL_TIME',
    salary: 14500,
    status: 'ACTIVE',
  });

  await User.findByIdAndUpdate(params.adminUserId, { employeeId: sarah._id });

  const marcus = await Employee.create({
    employeeId: 'EMP-1002',
    fullName: 'Marcus Vance',
    avatarUrl: '/src/assets/images/avatar_marcus_vance_1795588298086.jpg',
    email: 'marcus.vance@calibrehr.io',
    phone: '+1 (415) 890-3319',
    gender: 'Male',
    dateOfBirth: `1984-${bdayMonthDay}`,
    address: '712 Valencia Street',
    city: 'San Francisco',
    state: 'CA',
    departmentId: engDept._id,
    designationId: staffArchitect._id,
    joiningDate: '2023-03-01',
    employmentType: 'FULL_TIME',
    salary: 16200,
    reportingManagerId: sarah._id,
    status: 'ACTIVE',
  });

  const priya = await Employee.create({
    employeeId: 'EMP-1003',
    fullName: 'Priya Patel',
    avatarUrl: '/src/assets/images/avatar_priya_patel_1795588298490.jpg',
    email: 'priya.patel@calibrehr.io',
    phone: '+1 (415) 890-4402',
    gender: 'Female',
    dateOfBirth: `1990-${bday2MonthDay}`,
    address: '1920 Folsom Street',
    city: 'San Francisco',
    state: 'CA',
    departmentId: peopleDept._id,
    designationId: hrDirector._id,
    joiningDate: '2023-06-10',
    employmentType: 'FULL_TIME',
    salary: 12200,
    reportingManagerId: sarah._id,
    status: 'ACTIVE',
  });

  const david = await Employee.create({
    employeeId: 'EMP-1004',
    fullName: 'David Kim',
    avatarUrl: '/src/assets/images/avatar_david_kim_1795588299558.jpg',
    email: 'david.kim@calibrehr.io',
    phone: '+1 (415) 890-5518',
    gender: 'Male',
    dateOfBirth: '1992-08-22',
    address: '305 Howard Street',
    city: 'San Francisco',
    state: 'CA',
    departmentId: financeDept._id,
    designationId: payrollLead._id,
    joiningDate: '2024-01-08',
    employmentType: 'FULL_TIME',
    salary: 11800,
    reportingManagerId: sarah._id,
    status: 'ACTIVE',
  });

  const elena = await Employee.create({
    employeeId: 'EMP-1005',
    fullName: 'Elena Rostova',
    avatarUrl: '/src/assets/images/avatar_elena_rostova_1795588299478.jpg',
    email: 'elena.rostova@calibrehr.io',
    phone: '+1 (415) 890-6620',
    gender: 'Female',
    dateOfBirth: '1991-11-30',
    address: '88 Colin P Kelly Jr Street',
    city: 'San Francisco',
    state: 'CA',
    departmentId: designDept._id,
    designationId: designLead._id,
    joiningDate: '2024-02-19',
    employmentType: 'FULL_TIME',
    salary: 12400,
    reportingManagerId: sarah._id,
    status: 'ACTIVE',
  });

  const additionalEmployees = await Employee.create([
    {
      employeeId: 'EMP-1006',
      fullName: 'Liam OConnor',
      email: 'liam.oconnor@calibrehr.io',
      phone: '+1 (512) 440-1129',
      gender: 'Male',
      dateOfBirth: '1994-03-18',
      address: '210 Congress Ave',
      city: 'Austin',
      state: 'TX',
      departmentId: engDept._id,
      designationId: seniorEng._id,
      joiningDate: '2024-05-14',
      employmentType: 'FULL_TIME',
      salary: 11400,
      reportingManagerId: marcus._id,
      status: 'ACTIVE',
    },
    {
      employeeId: 'EMP-1007',
      fullName: 'Maya Lin',
      email: 'maya.lin@calibrehr.io',
      phone: '+1 (206) 550-7821',
      gender: 'Female',
      dateOfBirth: '1996-07-05',
      address: '1400 5th Ave',
      city: 'Seattle',
      state: 'WA',
      departmentId: engDept._id,
      designationId: frontendEng._id,
      joiningDate: '2025-01-20',
      employmentType: 'FULL_TIME',
      salary: 9800,
      reportingManagerId: marcus._id,
      status: 'ON_LEAVE',
    },
    {
      employeeId: 'EMP-1008',
      fullName: 'Noah Alvarez',
      email: 'noah.alvarez@calibrehr.io',
      phone: '+1 (646) 770-9340',
      gender: 'Male',
      dateOfBirth: '1993-09-14',
      address: '55 Water Street',
      city: 'New York',
      state: 'NY',
      departmentId: productDept._id,
      designationId: productMgr._id,
      joiningDate: '2025-04-07',
      employmentType: 'FULL_TIME',
      salary: 12100,
      reportingManagerId: sarah._id,
      status: 'ACTIVE',
    },
    {
      employeeId: 'EMP-1009',
      fullName: 'Hannah Brooks',
      email: 'hannah.brooks@calibrehr.io',
      phone: '+1 (312) 609-4412',
      gender: 'Female',
      dateOfBirth: '1997-01-27',
      address: '233 S Wacker Drive',
      city: 'Chicago',
      state: 'IL',
      departmentId: opsDept._id,
      designationId: revOpsAnalyst._id,
      joiningDate: '2026-08-11',
      employmentType: 'FULL_TIME',
      salary: 7900,
      reportingManagerId: david._id,
      status: 'ACTIVE',
    },
    {
      employeeId: 'EMP-1010',
      fullName: 'Omar Farooq',
      email: 'omar.farooq@calibrehr.io',
      phone: '+1 (404) 320-8871',
      gender: 'Male',
      dateOfBirth: '1995-12-03',
      address: '191 Peachtree Street',
      city: 'Atlanta',
      state: 'GA',
      departmentId: engDept._id,
      designationId: qaLead._id,
      joiningDate: '2026-09-15',
      employmentType: 'CONTRACT',
      salary: 9200,
      reportingManagerId: marcus._id,
      status: 'ACTIVE',
    },
    {
      employeeId: 'EMP-1011',
      fullName: 'Chloe Martin',
      email: 'chloe.martin@calibrehr.io',
      phone: '+1 (617) 502-3381',
      gender: 'Female',
      dateOfBirth: '2001-05-19',
      address: '100 Federal Street',
      city: 'Boston',
      state: 'MA',
      departmentId: designDept._id,
      designationId: designLead._id,
      joiningDate: '2026-10-01',
      employmentType: 'INTERN',
      salary: 4200,
      reportingManagerId: elena._id,
      status: 'ACTIVE',
    },
    {
      employeeId: 'EMP-1012',
      fullName: 'Victor Sterling',
      email: 'victor.sterling@calibrehr.io',
      phone: '+1 (303) 418-9902',
      gender: 'Male',
      dateOfBirth: '1989-10-11',
      address: '1700 Lincoln Street',
      city: 'Denver',
      state: 'CO',
      departmentId: financeDept._id,
      designationId: payrollLead._id,
      joiningDate: '2026-11-02',
      employmentType: 'PART_TIME',
      salary: 6100,
      reportingManagerId: david._id,
      status: 'ACTIVE',
    },
  ]);

  const allEmployees = [sarah, marcus, priya, david, elena, ...additionalEmployees];

  // Assign Department Heads
  await Promise.all([
    Department.findByIdAndUpdate(peopleDept._id, { headId: sarah._id }),
    Department.findByIdAndUpdate(engDept._id, { headId: marcus._id }),
    Department.findByIdAndUpdate(financeDept._id, { headId: david._id }),
    Department.findByIdAndUpdate(designDept._id, { headId: elena._id }),
  ]);

  // 4. Leave Balances for current year
  await LeaveBalance.insertMany(
    allEmployees.map((emp, idx) => ({
      employeeId: emp._id,
      year: currentYear,
      casualTotal: 12,
      casualUsed: idx % 4,
      sickTotal: 10,
      sickUsed: idx % 3,
      earnedTotal: 15,
      earnedUsed: (idx * 2) % 6,
      unpaidUsed: 0,
    }))
  );

  // 5. Attendance for the past 10 days
  const attendanceDocs: Array<Record<string, unknown>> = [];
  for (let d = 0; d < 10; d++) {
    const dateStr = formatDateOffset(d);
    const dayOfWeek = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    for (let i = 0; i < allEmployees.length; i++) {
      const emp = allEmployees[i];
      let status: 'PRESENT' | 'LATE' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' = 'PRESENT';
      let checkIn = '09:02';
      let checkOut = '17:35';
      let workHours = 8.5;

      if (emp.status === 'ON_LEAVE') {
        status = 'ON_LEAVE';
        checkIn = '';
        checkOut = '';
        workHours = 0;
      } else if ((i + d) % 11 === 0) {
        status = 'LATE';
        checkIn = '09:48';
        workHours = 7.75;
      } else if ((i + d) % 19 === 0) {
        status = 'HALF_DAY';
        checkIn = '09:00';
        checkOut = '13:15';
        workHours = 4.25;
      } else if ((i + d) % 23 === 0) {
        status = 'ABSENT';
        checkIn = '';
        checkOut = '';
        workHours = 0;
      }

      attendanceDocs.push({
        employeeId: emp._id,
        date: dateStr,
        status,
        checkIn,
        checkOut,
        workHours,
        createdBy: params.adminUserId,
        modifiedBy: params.adminUserId,
      });
    }
  }
  await Attendance.insertMany(attendanceDocs);

  // 6. Leave Requests
  const maya = additionalEmployees[1];
  const liam = additionalEmployees[0];
  const hannah = additionalEmployees[3];
  await LeaveRequest.create([
    {
      employeeId: maya._id,
      leaveType: 'EARNED',
      startDate: formatDateOffset(2),
      endDate: formatDateOffset(-2),
      totalDays: 4,
      reason: 'Scheduled family travel out of state.',
      status: 'APPROVED',
      reviewedBy: params.adminUserId,
      reviewComment: 'Approved. Handover complete.',
      reviewedAt: new Date(),
    },
    {
      employeeId: liam._id,
      leaveType: 'CASUAL',
      startDate: formatDateOffset(-7),
      endDate: formatDateOffset(-9),
      totalDays: 3,
      reason: 'Personal relocation and apartment move.',
      status: 'PENDING',
    },
    {
      employeeId: hannah._id,
      leaveType: 'SICK',
      startDate: formatDateOffset(-3),
      endDate: formatDateOffset(-4),
      totalDays: 2,
      reason: 'Dental surgery recovery.',
      status: 'PENDING',
    },
  ]);

  // 7. Payroll records for current and previous month
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const payrollDocs: Array<Record<string, unknown>> = [];
  for (const emp of allEmployees) {
    const prevCalc = calculatePayroll({
      basicSalary: emp.salary,
      allowances: Math.round(emp.salary * 0.12),
      bonus: emp.employeeId === 'EMP-1002' ? 1000 : 0,
      deductions: Math.round(emp.salary * 0.08),
    });
    payrollDocs.push({
      employeeId: emp._id,
      periodMonth: prevMonth,
      periodYear: prevYear,
      ...prevCalc,
      status: 'PAID',
      approvedBy: params.adminUserId,
      paidAt: new Date(),
    });

    const currCalc = calculatePayroll({
      basicSalary: emp.salary,
      allowances: Math.round(emp.salary * 0.12),
      bonus: 0,
      deductions: Math.round(emp.salary * 0.08),
    });
    payrollDocs.push({
      employeeId: emp._id,
      periodMonth: currentMonth,
      periodYear: currentYear,
      ...currCalc,
      status: 'APPROVED',
      approvedBy: params.adminUserId,
    });
  }
  await Payroll.insertMany(payrollDocs);

  // 8. Performance Reviews
  await PerformanceReview.create([
    {
      employeeId: marcus._id,
      reviewerId: sarah._id,
      reviewPeriod: `Q4 ${currentYear}`,
      reviewDate: formatDateOffset(5),
      rating: 4.8,
      goals: [
        {
          title: 'Zero-downtime multi-region database migration',
          targetDate: formatDateOffset(-15),
          completionPct: 100,
          status: 'COMPLETED',
        },
        {
          title: 'Mentor 3 senior engineers on security architecture',
          targetDate: formatDateOffset(-30),
          completionPct: 85,
          status: 'IN_PROGRESS',
        },
      ],
      feedback: 'Exceptional architectural leadership and cross-team reliability delivery.',
      strengths: 'Systems thinking, security posture, crisp technical mentorship.',
      areasForGrowth: 'Delegate routine triage earlier during sprint planning.',
      status: 'SHARED',
    },
    {
      employeeId: elena._id,
      reviewerId: sarah._id,
      reviewPeriod: `Q4 ${currentYear}`,
      reviewDate: formatDateOffset(3),
      rating: 4.7,
      goals: [
        {
          title: 'Launch Calibre Design System v2 across HR modules',
          targetDate: formatDateOffset(-10),
          completionPct: 95,
          status: 'IN_PROGRESS',
        },
      ],
      feedback: 'Elevated visual polish and accessibility standards across the entire suite.',
      strengths: 'Design systems precision, WCAG compliance, rapid prototyping.',
      areasForGrowth: 'Expand user research cadence with enterprise HR directors.',
      status: 'ACKNOWLEDGED',
    },
    {
      employeeId: liam._id,
      reviewerId: marcus._id,
      reviewPeriod: `Q4 ${currentYear}`,
      reviewDate: formatDateOffset(1),
      rating: 4.3,
      goals: [
        {
          title: 'Reduce API p95 latency under 85ms',
          targetDate: formatDateOffset(-20),
          completionPct: 90,
          status: 'IN_PROGRESS',
        },
      ],
      feedback: 'Strong execution on backend indexing and query optimization.',
      strengths: 'Debugging speed, Mongoose indexing discipline.',
      areasForGrowth: 'Document runbooks more thoroughly ahead of on-call rotations.',
      status: 'SHARED',
    },
  ]);

  // 9. Notifications
  await Notification.create([
    {
      recipientUserId: params.adminUserId,
      title: '2 Pending Leave Requests',
      message: 'Liam OConnor and Hannah Brooks submitted leave requests awaiting approval.',
      category: 'LEAVE',
      link: '/leave',
    },
    {
      recipientUserId: params.adminUserId,
      title: 'Monthly Payroll Ready',
      message: `Payroll run for ${currentYear}-${String(currentMonth).padStart(2, '0')} is approved and ready for disbursement.`,
      category: 'PAYROLL',
      link: '/payroll',
    },
    {
      recipientUserId: params.adminUserId,
      title: 'Upcoming Team Birthdays',
      message: 'Marcus Vance and Priya Patel have upcoming birthdays within the next 10 days.',
      category: 'SYSTEM',
      link: '/employees',
    },
  ]);
}
