/*
 * LogIn Form
 */
import React, {
  useState, useCallback, useRef,
} from 'react';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { t } from 'ttag';

import { dateToString, getToday } from '../core/utils';
import { selectHistoricalTime } from '../store/actions';
import { requestHistoricalTimes } from '../store/actions/fetch';


function stringToDate(dateString) {
  if (!dateString) return '';
  // YYYYMMDD
  // eslint-disable-next-line max-len
  return `${dateString.substring(0, 4)}-${dateString.substring(4, 6)}-${dateString.substring(6)}`;
}

function stringToTime(timeString) {
  if (!timeString) return '';
  return `${timeString.substring(0, 2)}:${timeString.substring(2)}`;
}

const HistorySelect = () => {
  const dateSelect = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [times, setTimes] = useState([]);
  const [max] = useState(getToday());

  const [
    canvasId,
    canvasStartDate,
    historicalDate,
    historicalTime,
  ] = useSelector((state) => [
    state.canvas.canvasId,
    state.canvas.canvasStartDate,
    state.canvas.historicalDate,
    state.canvas.historicalTime,
  ], shallowEqual);

  const dispatch = useDispatch();

  const setTime = useCallback((date, time) => {
    const timeString = time.substring(0, 2) + time.substring(3, 5);
    const dateString = dateToString(date);
    dispatch(selectHistoricalTime(dateString, timeString));
  }, [dispatch]);

  const handleDateChange = useCallback(async (evt) => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    const date = evt.target.value;
    const newTimes = await requestHistoricalTimes(date, canvasId);
    if (newTimes && newTimes.length) {
      setTimes(newTimes);
      setTime(date, newTimes[0]);
    }
    setSubmitting(false);
  }, [submitting, times]);

  const changeTime = useCallback(async (diff) => {
    if (!times.length
      || !dateSelect || !dateSelect.current || !dateSelect.current.value) {
      return;
    }

    let newTimes = times;
    let newPos = times.indexOf(stringToTime(historicalTime)) + diff;
    let newSelectedDate = dateSelect.current.value;
    if (newPos >= times.length || newPos < 0) {
      setSubmitting(true);
      if (newPos < 0) {
        dateSelect.current.stepDown(1);
      } else {
        dateSelect.current.stepUp(1);
      }
      newSelectedDate = dateSelect.current.value;
      newTimes = await requestHistoricalTimes(
        newSelectedDate,
        canvasId,
      );
      setSubmitting(false);
      if (!newTimes || !newTimes.length) {
        return;
      }
      newPos = (newPos < 0) ? (newTimes.length - 1) : 0;
    }

    setTimes(newTimes);
    setTime(newSelectedDate, newTimes[newPos]);
  }, [historicalTime, times, submitting]);

  const selectedDate = stringToDate(historicalDate);
  const selectedTime = stringToTime(historicalTime);

  return (
    <div id="historyselect">
      <input
        type="date"
        pattern="\d{4}-\d{2}-\d{2}"
        key="dateinput"
        value={selectedDate}
        min={canvasStartDate}
        max={max}
        ref={dateSelect}
        onChange={handleDateChange}
      />
      <div key="timeselcon">
        { (!!times.length && historicalTime && !submitting)
          && (
            <div key="timesel">
              <button
                type="button"
                className="hsar"
                onClick={() => changeTime(-1)}
              >←</button>
              <select
                value={selectedTime}
                onChange={(evt) => setTime(selectedDate, evt.target.value)}
              >
                {times.map((value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="hsar"
                onClick={() => changeTime(+1)}
              >→</button>
            </div>
          )}
        { (submitting) && <p>{`${t`Loading`}...`}</p> }
        { (!times.length && !submitting) && <p>{t`Select Date above`}</p> }
      </div>
    </div>
  );
};

export default React.memo(HistorySelect);
