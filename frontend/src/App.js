import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import axios from "axios";
import "./App.css";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api/days";

// Помощна функция за вземане на дата в локален формат YYYY-MM-DD
const getLocalDateString = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().split("T")[0];
};

// Проверка дали пазарът е отворен (EUR/USD работи Понеделник-Петък)
const isTradingDay = (date) => {
  const day = date.getDay();
  // 0 е Неделя, 6 е Събота
  return day !== 0 && day !== 6;
};

function App() {
  const [date, setDate] = useState(new Date());
  const [history, setHistory] = useState({});
  const [progress, setProgress] = useState(0);

  // -- MODAL STATE --
  const [showModal, setShowModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(null);

  const rules = [
    "Изразен тренд",
    "Взето предишно ниво - BoS",
    "Взето с импулс - FVG",
    "Само свещи в посока тренда",
    "Да НЯМА други зони наоколо",
    "Допира свещта преди движението (OB)",
    "SL след предишно ниво + още малко",
    "R:R = 1:1",
    "Няма новина след 12 часа",
  ];

  // --- НАСТРОЙКИ ЗА ЦЕЛТА ---
  const GOAL_DAYS = 130;
  // Наказание при провал: Взима цял ден прогрес (Drawdown) - Risk/Reward 1:1
  const FAIL_PENALTY = 1;

  useEffect(() => {
    document.title = "Road to Independence";
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(API_URL);
      const historyMap = {};

      // Променлива за "нетна печалба" от дни
      let netScore = 0;

      res.data.forEach((item) => {
        historyMap[item.date] = item.status;

        if (item.status === "success") {
          netScore += 1; // Печеливш ден
        } else if (item.status === "fail") {
          netScore -= FAIL_PENALTY; // Загуба (Drawdown)
        }
      });

      // Защита да не пада под 0%
      if (netScore < 0) netScore = 0;

      setHistory(historyMap);

      // Калкулация
      const rawPercent = (netScore / GOAL_DAYS) * 100;
      const percent = Math.min(rawPercent, 100);

      // DEBUG LOG
      console.log(`📊 STATUS REPORT (Trading Logic):`);
      console.log(`   - Net Score (Days): ${netScore}`);
      console.log(`   - Цел дни: ${GOAL_DAYS}`);
      console.log(`   - Изчислен %: ${rawPercent.toFixed(4)}%`);

      setProgress(percent);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  // 1. При клик върху деня
  const handleDayClick = (value) => {
    const clickedDateStr = getLocalDateString(value);
    const todayStr = getLocalDateString(new Date());

    // Първа проверка: Отворен ли е пазарът?
    if (!isTradingDay(value)) {
      alert(
        "⛔ ПАЗАРЪТ Е ЗАТВОРЕН (WEEKEND).\n\nДисциплината е важна, но почивката е част от стратегията. Forex пазарът отваря в Понеделник."
      );
      return;
    }

    // Втора проверка: Днес ли е?
    if (clickedDateStr !== todayStr) {
      alert(
        "⚠️ Фокусът е върху днешния ден. Миналото е минало, бъдещето не е дошло."
      );
      return;
    }

    setSelectedDateStr(clickedDateStr);
    setShowModal(true);
  };

  // 2. Логика при натискане на бутон от модала
  const handleDecision = async (isSuccess) => {
    if (!selectedDateStr) return;

    const newStatus = isSuccess ? "success" : "fail";

    try {
      await axios.post(API_URL, { date: selectedDateStr, status: newStatus });
      setHistory((prev) => ({ ...prev, [selectedDateStr]: newStatus }));
      fetchHistory(); // Това ще преизчисли прогреса с новото наказание/награда
    } catch (err) {
      alert("Грешка при връзка със сървъра.");
    } finally {
      setShowModal(false);
      setSelectedDateStr(null);
    }
  };

  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const dStr = getLocalDateString(date);

      // Логика за оцветяване
      if (history[dStr] === "success") return "day-success";
      if (history[dStr] === "fail") return "day-fail";

      // Визуална подсказка за уикендите
      if (!isTradingDay(date)) return "weekend-day";
    }
    return null;
  };

  return (
    <div className="app-container">
      {/* CUSTOM MODAL / TOAST */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Спази ли Плана?</h2>
            <div className="modal-actions">
              <button
                className="btn-fail"
                onClick={() => handleDecision(false)}
              >
                ✖ НЕ УСПЯХ
              </button>
              <button
                className="btn-success"
                onClick={() => handleDecision(true)}
              >
                ✓ ИЗПЪЛНИХ ПЛАНА
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ЛЯВА ЧАСТ */}
      <div className="left-panel">
        <div className="header">
          <p className="subtitle">THE PROJECT</p>
          <h1>
            ROAD TO <br />
            <span className="outline">INDEPENDENCE</span>
          </h1>
        </div>

        <div className="rules-section">
          <h3> </h3>
          <ul className="rules-list">
            {rules.map((rule, index) => (
              <li key={index}>
                <span className="check-icon">✓</span> {rule}
              </li>
            ))}
          </ul>
        </div>

        <div className="mustang-engine">
          <div className="car-status">
            <span>MUSTANG GT</span>
            {/* Променихме визуализацията на 3 знака след запетаята за хирургическа точност */}
            <span>{progress.toFixed(3)}% ИЗПЪЛНЕНО</span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            >
              {progress > 1 && <span className="exhaust-fire">🔥</span>}
            </div>
          </div>
          <p className="quote">
            "Свободата не се дава. Тя се извоюва ден след ден."
          </p>
        </div>
      </div>

      {/* ДЯСНА ЧАСТ */}
      <div className="right-panel">
        <div className="calendar-bg-text">FREEDOM</div>
        <div className="calendar-wrapper">
          <Calendar
            onChange={setDate}
            value={date}
            onClickDay={handleDayClick}
            tileClassName={tileClassName}
            locale="bg-BG"
          />
        </div>

        <div className="legend">
          <div className="legend-item">
            <div className="dot green"></div> Спазен план
          </div>
          <div className="legend-item">
            <div className="dot red"></div> Неспазен план
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
