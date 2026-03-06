'use client'
// src/app/dashboard/attendance/page.tsx
import { useState, useEffect } from 'react'
import { formatTime, formatDate } from '@/lib/salary'

export default function AttendancePage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/attendance')
      .then(r => r.json())
      .then(d => { if (d.success) setRecords(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function calcHours(checkIn: string | null, checkOut: string | null) {
    if (!checkIn || !checkOut) return '—'
    const h = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000
    return h.toFixed(1) + 'h'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Attendance History</h1>
        <p className="text-slate-400 text-sm mt-1">Your complete attendance record</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No attendance records yet</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const hours = r.checkIn && r.checkOut
                    ? (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 3600000
                    : 0
                  return (
                    <tr key={r.id}>
                      <td className="font-medium text-white">{formatDate(r.date)}</td>
                      <td className="text-emerald-400">{formatTime(r.checkIn)}</td>
                      <td className="text-red-400">{formatTime(r.checkOut)}</td>
                      <td className="font-mono">{calcHours(r.checkIn, r.checkOut)}</td>
                      <td>
                        {r.checkIn && r.checkOut ? (
                          <span className="badge-green">{hours >= 8 ? 'Full Day' : hours >= 4 ? 'Half Day' : 'Short'}</span>
                        ) : r.checkIn ? (
                          <span className="badge-yellow">In Office</span>
                        ) : (
                          <span className="badge-red">Absent</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
