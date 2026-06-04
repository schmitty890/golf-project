import { useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { monthGrid, formatMonthLabel } from '../utils/dates';

const WEEKDAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const TONE_CLASSES = {
  open: 'bg-white text-walnut hover:border-ember',
  closed: 'border-red-300 bg-red-50 text-red-400 line-through',
  partial: 'border-amber-300 bg-amber-50 text-amber-700',
  rush: 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-500',
};

// Reusable month grid. The parent owns availability logic via getDayState(dateStr) ->
// { disabled, tone: 'open'|'closed'|'partial', selected } and onSelectDate(dateStr).
function MonthCalendar({ initialDate, getDayState, onSelectDate }) {
  const start = initialDate || new Date();
  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth() });

  const step = (delta) => setView((v) => {
    const d = new Date(v.year, v.month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const weeks = monthGrid(view.year, view.month);

  return (
    <div className="rounded-xl border border-cream-300 bg-cream-100 p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => step(-1)}
          className="rounded-lg p-1.5 text-walnut hover:bg-cream-300"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-walnut">{formatMonthLabel(view.year, view.month)}</span>
        <button
          type="button"
          onClick={() => step(1)}
          className="rounded-lg p-1.5 text-walnut hover:bg-cream-300"
          aria-label="Next month"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-walnut-300">
        {WEEKDAY_HEADERS.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>

      <div className="mt-1 space-y-1">
        {weeks.map((week) => (
          <div key={week.find(Boolean) || `blank-${week.indexOf(null)}`} className="grid grid-cols-7 gap-1">
            {week.map((dateStr, i) => {
              if (!dateStr) {
                // eslint-disable-next-line react/no-array-index-key
                return <div key={`pad-${i}`} />;
              }
              const { disabled, tone = 'open', selected } = getDayState(dateStr) || {};
              const dayNum = Number(dateStr.slice(-2));
              return (
                <button
                  type="button"
                  key={dateStr}
                  disabled={disabled}
                  onClick={() => onSelectDate(dateStr)}
                  className={`aspect-square rounded-lg border text-sm font-semibold transition-colors ${
                    // eslint-disable-next-line no-nested-ternary
                    disabled
                      ? 'cursor-not-allowed border-transparent bg-transparent text-walnut-200'
                      : selected
                        ? 'border-ember bg-ember text-white'
                        : `border-cream-300 ${TONE_CLASSES[tone]}`
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

MonthCalendar.propTypes = {
  initialDate: PropTypes.instanceOf(Date),
  getDayState: PropTypes.func.isRequired,
  onSelectDate: PropTypes.func.isRequired,
};

MonthCalendar.defaultProps = {
  initialDate: null,
};

export default MonthCalendar;
