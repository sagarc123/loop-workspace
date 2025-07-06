import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  CalendarIcon, 
  ClockIcon,
  UserGroupIcon,
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import CreateEventModal from './CreateEventModal';
import { nanoid } from 'nanoid';

const Calendar = ({ teamId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { userProfile } = useAuthStore();
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    if (teamId) {
      fetchEvents();
      fetchTeamMembers();
    }
  }, [teamId, currentDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const eventsRef = collection(db, 'teams', teamId, 'events');
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const q = query(
        eventsRef,
        where('startDate', '>=', startOfMonth),
        where('startDate', '<=', endOfMonth)
      );
      
      const querySnapshot = await getDocs(q);
      const eventsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const teamDocRef = doc(db, 'teams', teamId);
      const teamDocSnap = await getDoc(teamDocRef);
      if (!teamDocSnap.exists()) return;
      const teamData = teamDocSnap.data();
      const memberUids = teamData.members || [];
      if (memberUids.length === 0) return setTeamMembers([]);
      // Fetch user profiles for all members
      const usersRef = collection(db, 'users');
      const memberProfiles = [];
      for (const uid of memberUids) {
        const userDoc = await getDoc(doc(usersRef, uid));
        if (userDoc.exists()) {
          memberProfiles.push({ uid, ...userDoc.data() });
        }
      }
      setTeamMembers(memberProfiles);
    } catch (err) {
      setTeamMembers([]);
    }
  };

  const handleCreateEvent = async (eventData) => {
    try {
      // 1. Create a meeting document and generate a link
      const meetingId = nanoid(12);
      const meetingLink = `/meeting/${meetingId}`;
      await addDoc(collection(db, 'meetings'), {
        meetingId,
        teamId,
        title: eventData.title,
        createdAt: serverTimestamp(),
        link: meetingLink,
        attendees: eventData.attendees
      });

      // 2. Create the event with the meeting link
      await addDoc(collection(db, 'teams', teamId, 'events'), {
        ...eventData,
        createdBy: userProfile.uid,
        createdByName: userProfile.name,
        createdAt: serverTimestamp(),
        meetingLink,
        attendees: eventData.attendees
      });

      toast.success('Event created successfully!');
      setShowCreateModal(false);
      fetchEvents();

      // 3. Send notifications to invited users (except creator)
      const notificationPromises = (eventData.attendees || [])
        .filter(uid => uid !== userProfile.uid)
        .map(uid => addDoc(collection(db, 'notifications'), {
          recipientId: uid,
          type: 'event_invite',
          title: `You're invited: ${eventData.title}`,
          message: `Event on ${eventData.startDate.toLocaleString ? eventData.startDate.toLocaleString() : eventData.startDate}` +
            (meetingLink ? `\nMeeting link: ${window.location.origin}${meetingLink}` : ''),
          meetingLink,
          teamId,
          createdAt: serverTimestamp(),
          read: false
        }));
      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await deleteDoc(doc(db, 'teams', teamId, 'events', eventId));
      toast.success('Event deleted successfully');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter(event => {
      const eventDate = event.startDate.toDate ? event.startDate.toDate() : new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 animated-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6" style={{background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: '1rem', padding: '1.5rem 2rem', color: '#fff', boxShadow: '0 2px 16px 0 rgba(99,102,241,0.10)'}}>
        <div>
          <h1 className="text-3xl font-extrabold" style={{color: '#fff'}}>Calendar</h1>
          <p className="text-lg text-blue-100">Schedule and manage team events</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center animated-scale animated-ripple"
        >
          <PlusIcon className="h-5 w-5 mr-2 icon-animated" />
          Create Event
        </button>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 icon-animated"
            title="Previous Month"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          
          <button
            onClick={goToNextMonth}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 icon-animated"
            title="Next Month"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </div>
        
        <button
          onClick={goToToday}
          className="btn-secondary animated-scale"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="card animated-fade-in animated-scale">
        <div className="p-6">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-base font-semibold text-gray-500 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2 animated-stagger">
            {days.map((day, index) => {
              const isToday = day && day.toDateString() === new Date().toDateString();
              const isSelected = day && day.toDateString() === selectedDate.toDateString();
              const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();
              const dayEvents = getEventsForDate(day);

              return (
                <div
                  key={index}
                  className={`min-h-[110px] p-2 animated-scale transition-all duration-200 border border-gray-200 dark:border-dark-700 cursor-pointer ${
                    isToday ? 'bg-gradient-to-br from-primary-100 to-accent/30 dark:from-primary-900/30 dark:to-accent/20 ring-2 ring-accent' : ''
                  } ${isSelected ? 'ring-4 ring-primary-500' : ''} ${
                    !isCurrentMonth ? 'bg-gray-50 dark:bg-dark-700 opacity-60' : 'bg-white dark:bg-dark-800'
                  }`}
                  onClick={() => {
                    if (day) {
                      const localDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                      setSelectedDate(localDay);
                      setShowCreateModal(true);
                    }
                  }}
                  title={isToday ? 'Today' : ''}
                >
                  {day && (
                    <>
                      <div className={`text-lg font-bold mb-1 ${
                        isToday ? 'text-primary-600 dark:text-primary-400' : 
                        !isCurrentMonth ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className="text-xs p-1 bg-accent/20 dark:bg-accent-dark/30 text-accent-dark dark:text-accent rounded truncate cursor-pointer animated-scale"
                            title={event.title}
                          >
                            <CalendarIcon className="h-3 w-3 inline-block mr-1 icon-animated" />
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="mt-6 animated-fade-in">
          <div className="card animated-scale">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-gradient-to-r from-primary-50 to-accent/10 dark:from-primary-900/10 dark:to-accent/10 rounded-t-lg">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Events for {selectedDate.toLocaleDateString()}
              </h3>
            </div>
            <div className="p-6">
              {getEventsForDate(selectedDate).length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No events scheduled for this date
                </p>
              ) : (
                <div className="space-y-4 animated-stagger">
                  {getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className="flex items-start justify-between p-4 border border-gray-200 dark:border-dark-700 rounded-lg animated-scale bg-white dark:bg-dark-800 hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-bold text-primary-700 dark:text-primary-300 mb-1">
                          <CalendarIcon className="h-4 w-4 inline-block mr-1 icon-animated" />
                          {event.title}
                        </h4>
                        <p className="text-base text-gray-600 dark:text-gray-400 mb-2">
                          {event.description}
                        </p>
                        <div className="flex items-center flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <ClockIcon className="h-3 w-3 mr-1 icon-animated" />
                            {formatTime(event.startDate)} - {formatTime(event.endDate)}
                          </div>
                          {event.location && (
                            <div className="flex items-center">
                              <MapPinIcon className="h-3 w-3 mr-1 icon-animated" />
                              {event.location}
                            </div>
                          )}
                          <div className="flex items-center">
                            <UserGroupIcon className="h-3 w-3 mr-1 icon-animated" />
                            {event.attendees?.length || 0} attendees
                          </div>
                          {event.meetingLink && (
                            <div className="flex items-center">
                              <a
                                href={event.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent underline ml-2"
                              >
                                Meeting Link
                              </a>
                              {event.attendees?.includes(userProfile?.uid) && (
                                <a
                                  href={event.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 btn-primary btn-xs animated-scale animated-ripple"
                                >
                                  Join Meeting
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="btn-secondary btn-xs ml-4 animated-scale"
                        title="Delete Event"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateEvent}
          selectedDate={selectedDate}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
};

export default Calendar; 