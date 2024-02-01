const video = document.getElementById("video");
const canvasContainer = document.getElementById("canvasContainer");
const ageDisplay = document.getElementById("age");
const genderDisplay = document.getElementById("gender");

let descriptionUser = { age: 0, gender: "" };
let ageHistory = [];
let faceDetectActive = true;
let intervalState = null;

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
  faceapi.nets.faceExpressionNet.loadFromUri("./models"),
  faceapi.nets.ageGenderNet.loadFromUri("./models"),
]).then(startVideo);

async function startVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });

    if ("srcObject" in video) {
      video.srcObject = stream;
    } else {
      video.src = window.URL.createObjectURL(stream);
    }

    video.onloadedmetadata = () => {
      video.play();
    };
  } catch (err) {
    console.error("Error accessing webcam:", err);
  }
}

function handlePlay() {
  if (!faceDetectActive) return;

  const canvas = document.createElement("canvas");
  canvas.width = video.width; // Set the width attribute
  canvas.height = video.height; // Set the height attribute
  canvasContainer.appendChild(canvas);

  const displaySize = { width: video.width, height: video.height };

  const captureDuration = 3000;
  let startTime = new Date().getTime();
  let currentWindowStartTime = startTime;

  const interval = setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();

    if (detections && detections.length > 0) {
      const currentAge = Math.floor(detections[0].age);
      const currentGender = detections[0].gender;

      ageHistory.push(currentAge);

      const currentTime = new Date().getTime();

      if (currentTime - currentWindowStartTime >= captureDuration) {
        const averageAge =
          ageHistory.length > 0
            ? ageHistory.reduce((sum, age) => sum + age, 0) / ageHistory.length
            : currentAge;

        descriptionUser = { age: averageAge, gender: currentGender };

        ageHistory = [];
        currentWindowStartTime = currentTime;
      }

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    } else {
      descriptionUser = {
        age: "Attente de détection...",
        gender: "Attente de détection...",
      };
      ageHistory = [];
      currentWindowStartTime = new Date().getTime();
    }

    ageDisplay.textContent = `Age : ${Math.floor(descriptionUser.age)}`;
    genderDisplay.textContent = `Gender : ${descriptionUser.gender}`;
  }, 100);

  intervalState = interval;
}

video.addEventListener("play", handlePlay);
