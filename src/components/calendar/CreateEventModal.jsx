import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, Switch } from '@headlessui/react';
import toast from 'react-hot-toast';

const CreateEventModal = ({ onClose, onCreate, selectedDate, teamMembers = [] }) => {
  // Default to next hour for start, one hour after for end
  const getDefaultTimes = (date) => {
    const now = new Date();
    let base = date ? new Date(date) : now;
    base.setHours(now.getHours() + 1, 0, 0, 0);
    const start = base;
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
      startDate: start.toISOString().split('T')[0],
      startTime: start.toTimeString().slice(0,5),
      endDate: end.toISOString().split('T')[0],
      endTime: end.toTimeString().slice(0,5)
    };
  };
  const defaultTimes = getDefaultTimes(selectedDate);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startDate: defaultTimes.startDate,
    endDate: defaultTimes.endDate
  });
  const [loading, setLoading] = useState(false);
  const [attendees, setAttendees] = useState(teamMembers.map(m => m.uid));
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      const date = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const yyyyMMdd = `${year}-${month}-${day}`;
      const defaultTime = '09:00';
      setFormData(prev => ({
        ...prev,
        startDate: `${yyyyMMdd}T${defaultTime}`,
        endDate: `${yyyyMMdd}T${defaultTime}`
      }));
    }
  }, [selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Event title is required');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error('Start and end dates are required');
      return;
    }

    const startDateTime = new Date(formData.startDate);
    const endDateTime = new Date(formData.endDate);

    if (isNaN(startDateTime) || isNaN(endDateTime)) {
      toast.error('Invalid date or time');
      return;
    }

    if (startDateTime >= endDateTime) {
      toast.error('End time must be after start time');
      return;
    }

    setLoading(true);
    try {
      await onCreate({
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        startDate: startDateTime,
        endDate: endDateTime,
        attendees
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAttendeeChange = (uid) => {
    setAttendees(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animated-fade-in">
      <div className={`card max-w-lg w-full animated-scale ${darkMode ? 'dark' : ''}`} style={{padding: 0}}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem', color: '#fff'}}>
          <h2 className="text-2xl font-bold">Create Event</h2>
          <button onClick={onClose} className="icon-animated text-white text-xl">×</button>
        </div>
        <div className="px-6 py-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-end mb-4">
            <Switch
              checked={darkMode}
              onChange={setDarkMode}
              className={`${darkMode ? 'bg-accent' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
            >
              <span className="sr-only">Enable dark mode</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </Switch>
            <span className="ml-2 text-xs text-gray-500">Dark Mode</span>
          </div>
          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input type="text" name="title" className="input-field w-full" value={formData.title} onChange={handleChange} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea name="description" className="input-field w-full" value={formData.description} onChange={handleChange} rows={2} />
            </div>
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Start</label>
                <input type="datetime-local" name="startDate" className="input-field w-full" value={formData.startDate} onChange={handleChange} required />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">End</label>
                <input type="datetime-local" name="endDate" className="input-field w-full" value={formData.endDate} onChange={handleChange} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input type="text" name="location" className="input-field w-full" value={formData.location} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Attendees</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {teamMembers && teamMembers.map(member => (
                  <label key={member.uid} className="flex items-center space-x-2 cursor-pointer px-2 py-1 rounded-lg bg-gray-100 dark:bg-dark-700 hover:bg-accent/10 dark:hover:bg-accent-dark/20 transition-colors">
                    <img src={member.photoURL || `https://ui-avatars.com/api/?name=${member.name || member.email}`}
                      alt={member.name}
                      className="w-7 h-7 rounded-full avatar-animated border-2 border-transparent" />
                    <span className="text-sm text-gray-800 dark:text-gray-200">{member.name || member.email}</span>
                    <input
                      type="checkbox"
                      className="form-checkbox ml-2"
                      checked={attendees.includes(member.uid)}
                      onChange={() => handleAttendeeChange(member.uid)}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button type="button" onClick={onClose} className="btn-secondary animated-scale">Cancel</button>
              <button type="submit" className="btn-primary animated-scale animated-ripple">Create Event</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEventModal; 