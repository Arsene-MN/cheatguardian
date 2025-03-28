# CheatGuardian: Exam Cheating Detector 🎓🔍  

CheatGuardian is a Machine Learning project that detects cheating behaviors during online exams using real-time video analysis. It leverages **TensorFlow.js, BlazeFace, and OpenCV.js** to track face movements, detect multiple faces, and analyze suspicious activity.  
Dataset used for training was (https://www.kaggle.com/datasets/fareselmenshawii/face-detection-dataset)

---

## Features  
✅ **Face Detection & Tracking** – Identifies and tracks students' faces during exams.  
✅ **Multiple Face Detection** – Flags if more than one person appears on camera.  
✅ **Head & Eye Movement Analysis** – Detects frequent looking away.  
✅ **Audio Monitoring** – Identifies suspicious background voices.  
✅ **Real-Time Processing** – Live alerts for detected cheating behavior.  
✅ **Logging System** – Records flagged incidents for instructor review.  

---

## Tech Stack  
- **Frontend:** React.js(Vite), Shadcn UI 
- **Backend:** Express.js  
- **AI Models:** TensorFlow.js, BlazeFace (for face detection), OpenCV.js  
---

## Installation  

### Clone the Repository  
```sh
https://github.com/Arsene-MN/cheatguardian
cd cheatguardian
```

### Install dependencies
```sh
npm install --legacy-peer-deps
```
### Run the project
```sh
npm run dev
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.
