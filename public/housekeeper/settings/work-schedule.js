// public/housekeeper/settings/schedule.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('Work schedule settings script loaded');

  // --- Firebase Services (Assuming global availability) ---
  const auth = firebase.auth();
  const firestoreService = window.firestoreService;
  // Assuming dateUtils is loaded globally via <script type="module"> in HTML
  // No, dateUtils needs to be imported if this is a module
  // Let's assume it's loaded globally for now if schedule.html uses <script type="module" src="../../common/js/date-utils.js">
  // If schedule.js itself becomes a module, it needs: import * as dateUtils from '../../common/js/date-utils.js';

  // --- Local State & Constants ---
  const workingDays = {};
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const DEFAULT_JOBS_PER_DAY = 2;
  const DEFAULT_BREAK_TIME = 90;
  const DEFAULT_START_TIME = '08:00'; // Use 24hr format internally
  const DEFAULT_JOB_DURATION = 180;

  // Initialize local workingDays state
  dayNames.forEach(day => {
    workingDays[day] = {
        isWorking: false,
        jobsPerDay: null,
        startTime: null,
        breakTime: null,
        breakDurations: [],
        jobDurations: []
    };
  });
  console.log('Local workingDays initialized:', workingDays);

  // --- UI Element References ---
  const dayToggles = document.querySelectorAll('.day-toggle');
  // We'll get specific day setting containers dynamically
  // Need a Save button reference specific to this page now
  const savingIndicator = document.getElementById('saving-indicator');
  const saveScheduleButton = document.getElementById('save-schedule-button'); // Restored original ID

  // --- Functions (Copied and adapted from settings-old.js) ---

  function showSavingIndicator() {
      console.log('Showing schedule saving indicator');
      if (!savingIndicator) return;
      savingIndicator.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Saving...';
      if (saveScheduleButton) saveScheduleButton.disabled = true;
  }

  function hideSavingIndicator(success = true) {
      if (!savingIndicator) return;
      if (success) {
          savingIndicator.innerHTML = '<i class="fas fa-check mr-2 text-green-500"></i> Saved!';
      } else {
          savingIndicator.innerHTML = '<i class="fas fa-times mr-2 text-red-500"></i> Error saving!';
      }
      // Keep message slightly longer for user feedback
      setTimeout(() => { 
          if (savingIndicator) savingIndicator.innerHTML = ''; 
      }, 2500);
      if (saveScheduleButton) saveScheduleButton.disabled = false;
  }

  function convertTo12HourFormat(timeStr) {
    if (!timeStr) return '';
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) throw new Error('Invalid time component');
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) { console.error('Error converting time format:', timeStr, error); return timeStr; }
  }

  function convertTo24HourFormat(timeStr) {
    if (!timeStr || (timeStr.includes(':') && !timeStr.includes('AM') && !timeStr.includes('PM'))) return timeStr;
    try {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)/i);
        if (!match) return timeStr; // Assume already 24hr if no period
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3].toUpperCase();
        if (isNaN(hours) || isNaN(minutes)) throw new Error('Invalid time component');
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0; // Midnight case
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) { console.error('Error converting to 24-hour format:', timeStr, error); return timeStr; }
  }

  // Applies ONLY the work schedule parts of the settings
  function applyLoadedScheduleSettings(settings) {
      console.log('Applying loaded WORK SCHEDULE settings to UI:', settings);
      if (!settings || !settings.workingDays) {
          console.warn('Invalid or missing workingDays settings, applying defaults.');
          settings = { workingDays: {} }; // Use empty object to trigger defaults
      }

      dayNames.forEach(day => {
          const daySettings = settings.workingDays[day] || {}; // Get specific day or default
          const currentDayState = workingDays[day]; // Local state for this page

          // Apply settings to local state, using defaults where necessary
          currentDayState.isWorking = daySettings.isWorking === true;
          currentDayState.jobsPerDay = daySettings.jobsPerDay !== undefined && daySettings.jobsPerDay !== null ? daySettings.jobsPerDay : DEFAULT_JOBS_PER_DAY;
          const loadedStartTime = daySettings.startTime ? convertTo24HourFormat(daySettings.startTime) : DEFAULT_START_TIME;
          currentDayState.startTime = loadedStartTime;
          currentDayState.breakTime = daySettings.breakTime !== undefined && daySettings.breakTime !== null ? daySettings.breakTime : DEFAULT_BREAK_TIME;

          // Ensure arrays exist and match jobsPerDay
          let jobDurations = Array.isArray(daySettings.jobDurations)
              ? daySettings.jobDurations.slice(0, currentDayState.jobsPerDay)
              : [];
          let breakDurations = Array.isArray(daySettings.breakDurations)
              ? daySettings.breakDurations.slice(0, Math.max(0, currentDayState.jobsPerDay - 1))
              : [];

          // Fill missing durations with defaults
          while (jobDurations.length < currentDayState.jobsPerDay) {
              jobDurations.push(DEFAULT_JOB_DURATION);
          }
          while (breakDurations.length < Math.max(0, currentDayState.jobsPerDay - 1)) {
              breakDurations.push(DEFAULT_BREAK_TIME);
          }
          currentDayState.jobDurations = jobDurations;
          currentDayState.breakDurations = breakDurations;
      });
      console.log('Finished applying schedule settings to local state:', workingDays);
      // Note: UI update happens in initializeWorkScheduleUI after this
  }

  // Validates and potentially corrects loaded schedule data formats
  function fixLoadedScheduleSettings(settingsData) {
      if (!settingsData || !settingsData.workingDays) return;
      console.log('[FIX] Checking schedule settings data...');
      dayNames.forEach(day => {
          const daySetting = settingsData.workingDays[day];
          if (!daySetting) return; // Skip if day doesn't exist

          // Convert startTime to 24hr format if it's in 12hr
          if (daySetting.startTime && (daySetting.startTime.includes('AM') || daySetting.startTime.includes('PM'))) {
              const convertedTime = convertTo24HourFormat(daySetting.startTime);
              if (convertedTime !== daySetting.startTime) {
                  console.log(`[FIX] Converted ${day} startTime to 24hr: ${convertedTime}`);
                  daySetting.startTime = convertedTime;
              }
          }
          
          // Ensure jobsPerDay is a number
          if (daySetting.jobsPerDay !== undefined && typeof daySetting.jobsPerDay !== 'number') {
               const parsedJobs = parseInt(daySetting.jobsPerDay, 10);
               daySetting.jobsPerDay = !isNaN(parsedJobs) ? parsedJobs : DEFAULT_JOBS_PER_DAY;
               console.log(`[FIX] Corrected ${day} jobsPerDay type/value: ${daySetting.jobsPerDay}`);
          }
          
          // Ensure breakTime is a number
           if (daySetting.breakTime !== undefined && typeof daySetting.breakTime !== 'number') {
               const parsedBreak = parseInt(daySetting.breakTime, 10);
               daySetting.breakTime = !isNaN(parsedBreak) ? parsedBreak : DEFAULT_BREAK_TIME;
               console.log(`[FIX] Corrected ${day} breakTime type/value: ${daySetting.breakTime}`);
           }
           
           // Initialize arrays if missing
           if (!Array.isArray(daySetting.jobDurations)) daySetting.jobDurations = [];
           if (!Array.isArray(daySetting.breakDurations)) daySetting.breakDurations = [];
           
           // Ensure durations are numbers
            daySetting.jobDurations = daySetting.jobDurations.map((d, i) => {
               if(typeof d !== 'number') { 
                   const parsedDuration = parseInt(d, 10);
                   const fixedDuration = !isNaN(parsedDuration) ? parsedDuration : DEFAULT_JOB_DURATION;
                   console.log(`[FIX] Corrected ${day} jobDuration[${i}] type/value: ${fixedDuration}`);
                   return fixedDuration;
               }
               return d;
           });
           daySetting.breakDurations = daySetting.breakDurations.map((d, i) => {
               if(typeof d !== 'number') { 
                   const parsedDuration = parseInt(d, 10);
                   const fixedDuration = !isNaN(parsedDuration) ? parsedDuration : DEFAULT_BREAK_TIME; 
                   console.log(`[FIX] Corrected ${day} breakDuration[${i}] type/value: ${fixedDuration}`);
                   return fixedDuration;
               }
               return d;
           });
      });
      console.log('[FIX] Finished checking schedule settings data.');
  }

  // Function to generate the UI for a specific day's settings
  function createDayUI(day, container, dayState) {
      container.innerHTML = ''; // Clear previous content

      // Start Time Input
      const startTimeDiv = document.createElement('div');
      startTimeDiv.innerHTML = `
        <label for="start-time-${day}" class="block text-sm font-medium text-gray-700">Start time</label>
        <div class="mt-1 relative rounded-md shadow-sm">
          <input type="time" id="start-time-${day}" name="start-time-${day}" 
                 class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-10 sm:text-sm border-gray-300 rounded-md appearance-none" 
                 value="${dayState.startTime || DEFAULT_START_TIME}">
           <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <i class="fas fa-clock text-gray-400"></i>
          </div>      
        </div>
        <p class="mt-1 text-xs text-gray-500">Tap to set when your first job starts</p>
      `;
      container.appendChild(startTimeDiv);
      startTimeDiv.querySelector('input').addEventListener('change', (e) => {
          const newTime = e.target.value;
          if (newTime) { // Prevent setting null
             workingDays[day].startTime = newTime; // Store as 24hr
             console.log(`Updated ${day} startTime (local): ${workingDays[day].startTime}`);
             updateDayVisualIndicators(day);
          } else {
              // Reset to current state if input is cleared
              e.target.value = workingDays[day].startTime || DEFAULT_START_TIME;
          }
      });

      // Number of Jobs Selector
      const jobsDiv = document.createElement('div');
      jobsDiv.className = 'mt-6'; // Increased spacing
      jobsDiv.innerHTML = `
        <label class="block text-sm font-medium text-gray-700">Number of jobs</label>
        <div class="mt-2 grid grid-cols-3 gap-3">
          ${[1, 2, 3].map(num => `
            <div>
              <button type="button" data-day="${day}" data-job-count="${num}" 
                      class="job-count-btn relative w-full flex flex-col items-center justify-center p-3 border rounded-md focus:outline-none transition-colors duration-150 
                             ${dayState.jobsPerDay === num ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-400' : 'border-gray-300 bg-white hover:bg-gray-50'}">
                <span class="text-2xl font-bold ${dayState.jobsPerDay === num ? 'text-blue-900' : 'text-gray-900'}">${num}</span>
                <span class="mt-1 text-xs ${dayState.jobsPerDay === num ? 'text-blue-700' : 'text-gray-500'}">${num === 1 ? 'job' : 'jobs'}</span>
              </button>
            </div>
          `).join('')}
        </div>
      `;
      container.appendChild(jobsDiv);
      jobsDiv.querySelectorAll('.job-count-btn').forEach(btn => {
          btn.addEventListener('click', () => setJobCount(day, parseInt(btn.dataset.jobCount)));
      });

      // Generated Schedule Preview
      const schedulePreviewDiv = document.createElement('div');
      schedulePreviewDiv.className = 'mt-6'; // Increased spacing
      schedulePreviewDiv.innerHTML = `
          <h4 class="text-sm font-medium text-gray-700 mb-2">Your Schedule</h4>
          <div class="timeline-container space-y-2 border border-gray-200 p-3 rounded-md bg-gray-50/50 min-h-[100px]">
              <!-- Timeline items will be generated here -->
              <p class="text-xs text-center text-gray-400 italic">Schedule preview updates automatically.</p>
          </div>
      `;
      container.appendChild(schedulePreviewDiv);

      updateDayVisualIndicators(day); // Initial render of the timeline
  }

  // Function to update local state and UI for job count change
  function setJobCount(day, jobCount) {
      const dayState = workingDays[day];
      if (!dayState || dayState.jobsPerDay === jobCount) return; // No change needed

      dayState.jobsPerDay = jobCount;
      console.log(`Updated ${day} jobsPerDay (local): ${jobCount}`);

      // Adjust duration arrays - Add defaults if needed, truncate if too long
      while (dayState.jobDurations.length < jobCount) {
          dayState.jobDurations.push(DEFAULT_JOB_DURATION);
      }
      if (dayState.jobDurations.length > jobCount) {
          dayState.jobDurations.length = jobCount;
      }

      const expectedBreaks = Math.max(0, jobCount - 1);
      while (dayState.breakDurations.length < expectedBreaks) {
          dayState.breakDurations.push(DEFAULT_BREAK_TIME);
      }
      if (dayState.breakDurations.length > expectedBreaks) {
          dayState.breakDurations.length = expectedBreaks;
      }

      // Update UI for job count buttons
      const container = document.querySelector(`[data-day-settings="${day}"]`);
      if (container) {
          container.querySelectorAll('.job-count-btn').forEach(btn => {
              const count = parseInt(btn.dataset.jobCount);
              const isActive = count === jobCount;
              btn.classList.toggle('bg-blue-100', isActive);
              btn.classList.toggle('border-blue-500', isActive);
              btn.classList.toggle('ring-2', isActive);
              btn.classList.toggle('ring-blue-400', isActive);
              btn.classList.toggle('border-gray-300', !isActive);
              btn.classList.toggle('bg-white', !isActive);
              btn.classList.toggle('hover:bg-gray-50', !isActive);

              const numSpan = btn.querySelector('span:first-child');
              const textSpan = btn.querySelector('span:last-child');
              numSpan.classList.toggle('text-blue-900', isActive);
              numSpan.classList.toggle('text-gray-900', !isActive);
              textSpan.classList.toggle('text-blue-700', isActive);
              textSpan.classList.toggle('text-gray-500', !isActive);
          });
          // Regenerate the schedule preview
          updateDayVisualIndicators(day);
      }
  }

  // Function to update local state for job duration change
  function updateJobDuration(day, jobIndex, durationMinutes) {
    const dayState = workingDays[day];
    if (!dayState || !dayState.jobDurations || jobIndex < 0 || jobIndex >= dayState.jobDurations.length) return;

    dayState.jobDurations[jobIndex] = durationMinutes;
    console.log(`Updated ${day} jobDurations[${jobIndex}] (local): ${durationMinutes}`);
    updateDayVisualIndicators(day); // Update preview
  }

  // Function to update local state for break duration change
  function updateBreakDuration(day, breakIndex, durationMinutes) {
      const dayState = workingDays[day];
      if (!dayState || !dayState.breakDurations || breakIndex < 0 || breakIndex >= dayState.breakDurations.length) return;

      dayState.breakDurations[breakIndex] = durationMinutes;
      console.log(`Updated ${day} breakDurations[${breakIndex}] (local): ${durationMinutes}`);
      updateDayVisualIndicators(day); // Update preview
  }

  // Function to update the visual timeline for a day
  function updateDayVisualIndicators(day) {
      const dayState = workingDays[day];
      const container = document.querySelector(`[data-day-settings="${day}"] .timeline-container`);
      if (!container || !dayState || !dayState.isWorking) {
           if(container) container.innerHTML = '<p class="text-xs text-center text-gray-400 italic">Not working this day.</p>';
          return;
      }

      const slots = calculateDayTimeSlots(dayState);
      container.innerHTML = ''; // Clear previous timeline

      if (slots.error) {
            container.innerHTML = `<p class="text-xs text-center text-red-500 italic">Error: ${slots.error}</p>`;
            return;
      }

      if (slots.timeline.length === 0) {
           container.innerHTML = '<p class="text-xs text-center text-gray-400 italic">No jobs selected.</p>';
           return;
      }

      slots.timeline.forEach((slot, index) => {
          const isJob = slot.type === 'job';
          const durationControlIdBase = `${day}-${slot.type}-${slot.index}`;
          const currentDuration = isJob ? dayState.jobDurations[slot.index] : dayState.breakDurations[slot.index];
          const minDuration = isJob ? 30 : 15;
          const maxDuration = isJob ? 480 : 120;

          // Use the 12-hour format for display
          const startTime12hr = convertTo12HourFormat(slot.start);
          const endTime12hr = convertTo12HourFormat(slot.end);

          const slotDiv = document.createElement('div');
          slotDiv.className = `relative flex items-center justify-between p-2 rounded border ${isJob ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-200'}`;

          slotDiv.innerHTML = `
              <div class="flex-shrink-0 w-16 text-xs ${isJob ? 'text-blue-700 font-medium' : 'text-gray-500'}">
                   ${startTime12hr} - ${endTime12hr}
              </div>
              <div class="flex-grow mx-2 text-sm ${isJob ? 'font-semibold text-blue-900' : 'text-gray-600'}">
                   ${isJob ? `Job ${slot.index + 1}` : 'Break'}
              </div>
              <div class="flex items-center space-x-1 flex-shrink-0">
                  <button data-control-id="${durationControlIdBase}-minus" class="duration-btn text-gray-500 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 rounded-full w-5 h-5 flex items-center justify-center text-xs p-0" ${currentDuration <= minDuration ? 'disabled' : ''}>-</button>
                  <span class="duration-display text-xs font-medium w-14 text-center tabular-nums ${isJob ? 'text-blue-800' : 'text-gray-700'}">${formatDuration(currentDuration)}</span>
                  <button data-control-id="${durationControlIdBase}-plus" class="duration-btn text-gray-500 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 rounded-full w-5 h-5 flex items-center justify-center text-xs p-0" ${currentDuration >= maxDuration ? 'disabled' : ''}>+</button>
               </div>
          `;
          container.appendChild(slotDiv);

          // Add event listeners for the +/- buttons
          const minusBtn = slotDiv.querySelector(`[data-control-id="${durationControlIdBase}-minus"]`);
          const plusBtn = slotDiv.querySelector(`[data-control-id="${durationControlIdBase}-plus"]`);
          
          const updateDuration = (change) => {
              let newDuration = currentDuration + change;
              newDuration = Math.max(minDuration, Math.min(maxDuration, newDuration)); // Clamp
              
              if (newDuration !== currentDuration) {
                    if (isJob) {
                        updateJobDuration(day, slot.index, newDuration);
                    } else {
                        updateBreakDuration(day, slot.index, newDuration);
                    }
              }
          };
          
          minusBtn.addEventListener('click', () => updateDuration(-15));
          plusBtn.addEventListener('click', () => updateDuration(15));
      });
      
      // Add total duration display
      const totalDurationDiv = document.createElement('div');
      totalDurationDiv.className = 'text-right text-xs text-gray-500 mt-1 pt-1 border-t border-gray-200';
      const totalHours = (slots.totalDuration / 60).toFixed(1);
      totalDurationDiv.textContent = `Total duration for ${day}: ${totalHours} hours`;
      container.appendChild(totalDurationDiv);

      // Debug log
      // console.log(`Updating visual indicators for ${day}, Total duration: ${slots.totalDuration} minutes`);
  }
  
  // Function to calculate timeline slots based on current state
  function calculateDayTimeSlots(daySettings) {
    if (!daySettings || !daySettings.isWorking || !daySettings.startTime || !daySettings.jobsPerDay) {
        return { timeline: [], totalDuration: 0, error: 'Missing required settings' };
    }

    const timeline = [];
    let currentTime;
    let totalDuration = 0;
    const maxTime = 24 * 60; // Max minutes in a day

    try {
        currentTime = timeStringToMinutes(daySettings.startTime);
        if (currentTime === null) throw new Error('Invalid start time format');

        for (let i = 0; i < daySettings.jobsPerDay; i++) {
            const jobDuration = daySettings.jobDurations[i] === undefined ? DEFAULT_JOB_DURATION : daySettings.jobDurations[i];
            if (typeof jobDuration !== 'number' || jobDuration <= 0) throw new Error(`Invalid duration for Job ${i+1}`);
            
            // Add job slot
            const jobStartMinutes = currentTime;
            const jobEndMinutes = jobStartMinutes + jobDuration;
            if (jobEndMinutes > maxTime) throw new Error('Schedule exceeds end of day');

            timeline.push({
                type: 'job',
                index: i,
                start: minutesToTimeString(jobStartMinutes),
                end: minutesToTimeString(jobEndMinutes)
            });
            totalDuration += jobDuration;
            currentTime = jobEndMinutes;

            // Add break slot if not the last job
            if (i < daySettings.jobsPerDay - 1) {
                const breakDuration = daySettings.breakDurations[i] === undefined ? DEFAULT_BREAK_TIME : daySettings.breakDurations[i];
                if (typeof breakDuration !== 'number' || breakDuration < 0) throw new Error(`Invalid duration for Break ${i+1}`); // Allow 0 min break
                
                if (breakDuration > 0) { // Only add break if duration > 0
                    const breakStartMinutes = currentTime;
                    const breakEndMinutes = breakStartMinutes + breakDuration;
                    if (breakEndMinutes > maxTime) throw new Error('Schedule exceeds end of day during break');
                    
                    timeline.push({
                        type: 'break',
                        index: i,
                        start: minutesToTimeString(breakStartMinutes),
                        end: minutesToTimeString(breakEndMinutes)
                    });
                    totalDuration += breakDuration;
                    currentTime = breakEndMinutes;
                }
            }
        }
         return { timeline, totalDuration, error: null };
    } catch (error) {
        console.error('Error calculating timeline:', error);
        return { timeline: [], totalDuration: 0, error: error.message };
    }
}

// Helper to convert HH:MM string to minutes since midnight
function timeStringToMinutes(timeStr) {
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours * 60 + minutes;
    } catch (e) {
        return null;
    }
}

// Helper to convert minutes since midnight to HH:MM string
function minutesToTimeString(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Helper function to format duration in minutes to "X hr Y min"
function formatDuration(totalMinutes) {
    if (totalMinutes === null || totalMinutes === undefined || totalMinutes < 0) { // Allow 0
        return '0 min'; 
    }
    if (totalMinutes === 0) return '0 min';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let durationStr = '';
    if (hours > 0) {
        durationStr += `${hours} hr`;
    }
    if (minutes > 0) {
         if (hours > 0) durationStr += ' '; // Add space if hours are also present
        durationStr += `${minutes} min`;
    }
    return durationStr.trim(); // If 0, was handled above
}


  // Function to initialize the UI based on current state (called after loading)
  function initializeWorkScheduleUI() {
    console.log('Initializing work schedule UI...');
    // Find toggles within the current page context
    document.querySelectorAll('.day-toggle').forEach(toggle => {
        const day = toggle.dataset.dayToggle;
        const settingsContainer = document.querySelector(`[data-day-settings="${day}"]`);
        const dayState = workingDays[day]; // Use local state

        if (!toggle || !settingsContainer || !dayState) {
            console.warn(`Missing elements or state for day: ${day}`);
            return;
        }

         toggle.checked = dayState.isWorking;
         if (dayState.isWorking) {
            settingsContainer.classList.remove('hidden');
            createDayUI(day, settingsContainer, dayState);
        } else {
            settingsContainer.classList.add('hidden');
            settingsContainer.innerHTML = ''; // Clear content when hidden
        }

        // Add event listener for the toggle
        toggle.addEventListener('change', (e) => {
            const isWorking = e.target.checked;
            workingDays[day].isWorking = isWorking;
            console.log(`Updated ${day} isWorking (local): ${isWorking}`);
            if (isWorking) {
                settingsContainer.classList.remove('hidden');
                // Set defaults if turning on for the first time or if data is missing
                if (workingDays[day].jobsPerDay === null) workingDays[day].jobsPerDay = DEFAULT_JOBS_PER_DAY;
                if (workingDays[day].startTime === null) workingDays[day].startTime = DEFAULT_START_TIME;
                // Ensure duration arrays are initialized and populated
                const expectedJobs = workingDays[day].jobsPerDay;
                if (!Array.isArray(workingDays[day].jobDurations)) workingDays[day].jobDurations = [];
                if (!Array.isArray(workingDays[day].breakDurations)) workingDays[day].breakDurations = [];
                 while (workingDays[day].jobDurations.length < expectedJobs) {
                    workingDays[day].jobDurations.push(DEFAULT_JOB_DURATION);
                }
                const expectedBreaks = Math.max(0, expectedJobs - 1);
                 while (workingDays[day].breakDurations.length < expectedBreaks) {
                    workingDays[day].breakDurations.push(DEFAULT_BREAK_TIME);
                }
                // Ensure breakTime itself is defaulted if null (needed for calculation?)
                if (workingDays[day].breakTime === null) workingDays[day].breakTime = DEFAULT_BREAK_TIME;

                createDayUI(day, settingsContainer, workingDays[day]); // Pass current state
            } else {
                settingsContainer.classList.add('hidden');
                settingsContainer.innerHTML = ''; // Clear content
            }
             // updateDayVisualIndicators(day); // createDayUI calls this already
        });
    });
  }

  // --- Save Logic ---
  async function saveScheduleSettings() {
    showSavingIndicator();
    const user = auth.currentUser;
    if (!user) {
        console.error('User not authenticated. Cannot save settings.');
        hideSavingIndicator(false);
        alert('Error: You are not logged in.');
        return;
    }

    console.log('Preparing schedule settings for saving:', workingDays);

    // Prepare the payload - only include relevant schedule fields
    const settingsToSave = {
        workingDays: { ...workingDays }, // Send the current local state
        // Exclude other settings like timezone, autoSendReceipts - handled elsewhere
    };

    // Validate before saving
    let isValid = true;
    let errorMessages = [];
    dayNames.forEach(day => {
        const daySetting = settingsToSave.workingDays[day];
        if (daySetting.isWorking) {
            if (!daySetting.startTime) {
                 errorMessages.push(`Start time is missing for ${day}.`);
                 isValid = false;
            }
            // Check calculated timeline for errors (like exceeding end of day)
            const validationSlots = calculateDayTimeSlots(daySetting);
            if (validationSlots.error) {
                errorMessages.push(`Schedule error for ${day}: ${validationSlots.error}`);
                isValid = false;
            }
        }
    });

    if (!isValid) {
        alert('Please fix the errors before saving:\n- ' + errorMessages.join('\n- '));
        hideSavingIndicator(false);
        return;
    }

    try {
        // Use firestoreService to update only the workingDays part
        await firestoreService.updateUserSettings(user.uid, { workingDays: settingsToSave.workingDays });
        console.log('Work schedule settings saved successfully.');
        hideSavingIndicator(true);
    } catch (error) {
        console.error('Error saving work schedule settings:', error);
        hideSavingIndicator(false);
        alert('Error saving schedule settings: ' + error.message);
    }
  }

  // --- Initialization ---
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      console.log('User logged in on schedule settings page.');
      // Load only the schedule-relevant settings
      try {
          const settings = await firestoreService.getUserSettings(user.uid);
          if (settings && settings.workingDays) { // Ensure workingDays exists
              fixLoadedScheduleSettings(settings); // Fix format issues before applying
              applyLoadedScheduleSettings(settings); // Apply to local state and UI
              initializeWorkScheduleUI(); // Ensure UI reflects loaded state and attach listeners
          } else {
              console.log('No saved schedule settings found, applying defaults.');
              applyLoadedScheduleSettings({}); // Apply defaults
              initializeWorkScheduleUI();
          }
      } catch (error) {
          console.error('Failed to load initial schedule settings:', error);
          // Apply defaults if loading fails
          applyLoadedScheduleSettings({});
          initializeWorkScheduleUI();
          alert('Could not load your saved schedule settings. Defaults applied.');
      }
      // Add listener to the footer button for this page
      if (saveScheduleButton) {
          saveScheduleButton.addEventListener('click', saveScheduleSettings);
      } else {
          console.error('Footer save button (#save-schedule-button) not found!'); // Updated error message
      }

    } else {
      // User logged out - handled by auth-router, maybe disable save button?
      console.log('User logged out on schedule settings page.');
       if (saveScheduleButton) saveScheduleButton.disabled = true;
    }
  });

}); 