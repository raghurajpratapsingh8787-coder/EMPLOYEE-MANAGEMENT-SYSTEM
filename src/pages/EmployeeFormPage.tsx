import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageTransition } from '../animations/motion';
import type { DepartmentRef, DesignationRef, EmployeeRecord } from '../types/hr';

const formSchema = z.object({
  employeeId: z.string().trim().min(2, 'Required').toUpperCase(),
  fullName: z.string().trim().min(2, 'Required'),
  email: z.string().trim().email('Valid email required'),
  phone: z.string().trim().min(5, 'Required'),
  gender: z.enum(['Male', 'Female', 'Non-binary', 'Prefer not to say']),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  address: z.string().trim().min(2, 'Required'),
  city: z.string().trim().min(2, 'Required'),
  state: z.string().trim().min(2, 'Required'),
  departmentId: z.string().min(1, 'Select a department'),
  designationId: z.string().min(1, 'Select a designation'),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']),
  salary: z.coerce.number().min(0, 'Must be 0 or greater'),
  reportingManagerId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']),
});

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [departments, setDepartments] = useState<DepartmentRef[]>([]);
  const [designations, setDesignations] = useState<DesignationRef[]>([]);
  const [managers, setManagers] = useState<EmployeeRecord[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: '',
      fullName: '',
      email: '',
      phone: '',
      gender: 'Prefer not to say',
      dateOfBirth: '1994-01-15',
      address: '',
      city: '',
      state: '',
      departmentId: '',
      designationId: '',
      joiningDate: new Date().toISOString().slice(0, 10),
      employmentType: 'FULL_TIME',
      salary: 8500,
      reportingManagerId: '',
      status: 'ACTIVE',
    },
  });

  const selectedDeptId = watch('departmentId');

  useEffect(() => {
    Promise.all([
      apiRequest<{ items: DepartmentRef[] }>('/api/organization/departments'),
      apiRequest<{ items: DesignationRef[] }>('/api/organization/designations'),
      apiRequest<{ items: EmployeeRecord[] }>('/api/employees?limit=100'),
    ])
      .then(([deptRes, desigRes, empRes]) => {
        setDepartments(deptRes.items);
        setDesignations(desigRes.items);
        setManagers(empRes.items);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    apiRequest<{ employee: EmployeeRecord }>(`/api/employees/${id}`)
      .then((res) => {
        const e = res.employee;
        reset({
          employeeId: e.employeeId,
          fullName: e.fullName,
          email: e.email,
          phone: e.phone,
          gender: e.gender,
          dateOfBirth: e.dateOfBirth || '1994-01-15',
          address: e.address || '',
          city: e.city,
          state: e.state,
          departmentId: e.departmentId?._id || '',
          designationId: e.designationId?._id || '',
          joiningDate: e.joiningDate,
          employmentType: e.employmentType,
          salary: e.salary ?? 0,
          reportingManagerId: e.reportingManagerId?._id || '',
          status: e.status,
        });
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : 'Failed to load employee', 'error');
        navigate('/employees');
      });
  }, [isEdit, id, reset, navigate, showToast]);

  const filteredDesignations = selectedDeptId
    ? designations.filter((d) => {
        const dId = typeof d.departmentId === 'string' ? d.departmentId : d.departmentId?._id;
        return dId === selectedDeptId;
      })
    : designations;

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      let targetId = id;
      if (isEdit && id) {
        await apiRequest(`/api/employees/${id}`, {
          method: 'PUT',
          body: JSON.stringify(values),
        });
      } else {
        const created = await apiRequest<{ employee: EmployeeRecord }>('/api/employees', {
          method: 'POST',
          body: JSON.stringify(values),
        });
        targetId = created.employee._id;
      }

      if (photoFile && targetId) {
        const fd = new FormData();
        fd.append('avatar', photoFile);
        await apiRequest(`/api/employees/${targetId}/avatar`, {
          method: 'POST',
          body: fd,
        });
      }

      showToast(isEdit ? 'Employee record updated' : 'Employee created successfully', 'success');
      navigate(targetId ? `/employees/${targetId}` : '/employees');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save employee', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600';

  return (
    <PageTransition>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isEdit ? 'Edit Employee Record' : 'Add New Employee'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Complete personal, employment, and compensation attributes.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-6"
        >
          {/* Personal Information */}
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-200 dark:border-slate-800">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div>
                <label htmlFor="emp-id" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Employee ID
                </label>
                <input id="emp-id" {...register('employeeId')} placeholder="EMP-1025" className={`${inputClass} font-mono`} />
                {errors.employeeId && <p className="text-xs text-rose-600 mt-1">{errors.employeeId.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="emp-name" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input id="emp-name" {...register('fullName')} placeholder="Jordan Taylor" className={inputClass} />
                {errors.fullName && <p className="text-xs text-rose-600 mt-1">{errors.fullName.message}</p>}
              </div>

              <div>
                <label htmlFor="emp-email" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Work Email
                </label>
                <input id="emp-email" type="email" {...register('email')} placeholder="jordan.taylor@calibrehr.io" className={inputClass} />
                {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="emp-phone" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input id="emp-phone" {...register('phone')} placeholder="+1 (415) 555-0148" className={inputClass} />
                {errors.phone && <p className="text-xs text-rose-600 mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label htmlFor="emp-gender" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Gender
                </label>
                <select id="emp-gender" {...register('gender')} className={inputClass}>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label htmlFor="emp-dob" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Date of Birth
                </label>
                <input id="emp-dob" type="date" {...register('dateOfBirth')} className={inputClass} />
                {errors.dateOfBirth && <p className="text-xs text-rose-600 mt-1">{errors.dateOfBirth.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="emp-address" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Street Address
                </label>
                <input id="emp-address" {...register('address')} placeholder="400 Market Street" className={inputClass} />
                {errors.address && <p className="text-xs text-rose-600 mt-1">{errors.address.message}</p>}
              </div>

              <div>
                <label htmlFor="emp-city" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  City
                </label>
                <input id="emp-city" {...register('city')} placeholder="San Francisco" className={inputClass} />
                {errors.city && <p className="text-xs text-rose-600 mt-1">{errors.city.message}</p>}
              </div>

              <div>
                <label htmlFor="emp-state" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  State
                </label>
                <input id="emp-state" {...register('state')} placeholder="CA" className={inputClass} />
                {errors.state && <p className="text-xs text-rose-600 mt-1">{errors.state.message}</p>}
              </div>

              <div>
                <label htmlFor="emp-photo" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Profile Photo (JPEG/PNG/WEBP, max 2MB)
                </label>
                <label
                  htmlFor="emp-photo"
                  className="h-10 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer hover:border-blue-500"
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span className="truncate">{photoFile ? photoFile.name : 'Upload headshot'}</span>
                  <input
                    id="emp-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-200 dark:border-slate-800">
              Employment &amp; Compensation
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div>
                <label htmlFor="emp-dept" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select id="emp-dept" {...register('departmentId')} className={inputClass}>
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {errors.departmentId && <p className="text-xs text-rose-600 mt-1">{errors.departmentId.message}</p>}
              </div>

              <div>
                <label htmlFor="emp-desig" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Designation
                </label>
                <select id="emp-desig" {...register('designationId')} className={inputClass}>
                  <option value="">Select designation</option>
                  {filteredDesignations.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} (L{d.level})
                    </option>
                  ))}
                </select>
                {errors.designationId && <p className="text-xs text-rose-600 mt-1">{errors.designationId.message}</p>}
              </div>

              <div>
                <label htmlFor="emp-mgr" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Reporting Manager
                </label>
                <select id="emp-mgr" {...register('reportingManagerId')} className={inputClass}>
                  <option value="">None (Executive / Top-level)</option>
                  {managers
                    .filter((m) => m._id !== id)
                    .map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.fullName} ({m.employeeId})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="emp-join" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Joining Date
                </label>
                <input id="emp-join" type="date" {...register('joiningDate')} className={inputClass} />
                {errors.joiningDate && <p className="text-xs text-rose-600 mt-1">{errors.joiningDate.message}</p>}
              </div>

              <div>
                <label htmlFor="emp-type" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Employment Type
                </label>
                <select id="emp-type" {...register('employmentType')} className={inputClass}>
                  <option value="FULL_TIME">Full-time</option>
                  <option value="PART_TIME">Part-time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>

              <div>
                <label htmlFor="emp-status" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Employee Status
                </label>
                <select id="emp-status" {...register('status')} className={inputClass}>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On leave</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>

              <div>
                <label htmlFor="emp-salary" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Monthly Base Salary (USD)
                </label>
                <input
                  id="emp-salary"
                  type="number"
                  step="0.01"
                  {...register('salary')}
                  className={`${inputClass} font-mono tabular-nums`}
                />
                {errors.salary && <p className="text-xs text-rose-600 mt-1">{errors.salary.message}</p>}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Employee'}</span>
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
