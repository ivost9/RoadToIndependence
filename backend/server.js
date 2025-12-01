require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB (Road to Independence DB)"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

const DaySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  status: { type: String, enum: ["success", "fail"], required: true },
});

const DayLog = mongoose.model("DayLog", DaySchema);

// Routes
app.get("/api/days", async (req, res) => {
  try {
    const days = await DayLog.find();
    res.json(days);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/days", async (req, res) => {
  const { date, status } = req.body;

  // ВАЛИДАЦИЯ НА СЪРВЪРА:
  // Тъй като сървърът може да е в друга часова зона (UTC),
  // правим проверката малко по-гъвкава. Сравняваме дали датата е
  // "Днес" или "Вчера/Утре" (допускаме +/- 24 часа разлика заради часовите зони),
  // но разчитаме основно на Frontend проверката за точност.

  const today = new Date();
  const inputDate = new Date(date);

  // Разлика в часове между подадената дата и сървърното време
  const diffHours = Math.abs(today - inputDate) / 36e5;

  // Ако разликата е повече от 48 часа, значи някой се опитва да излъже системата
  if (diffHours > 48) {
    return res
      .status(400)
      .json({ message: "Грешка: Можеш да оценяваш само текущия период!" });
  }

  try {
    const updatedDay = await DayLog.findOneAndUpdate(
      { date },
      { status },
      { new: true, upsert: true }
    );
    res.json(updatedDay);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🏎️  Road to Independence engine running on port ${PORT}`)
);
