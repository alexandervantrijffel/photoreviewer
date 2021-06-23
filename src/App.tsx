import React from "react";
import logo from "./logo.svg";
import "./App.css";
import ImageGallery from "react-image-gallery";
import ky from "ky";

const images = [
  {
    original: "https://picsum.photos/id/1018/1000/600/",
    thumbnail: "https://picsum.photos/id/1018/250/150/",
  },
  {
    original: "https://picsum.photos/id/1015/1000/600/",
    thumbnail: "https://picsum.photos/id/1015/250/150/",
  },
  {
    original: "https://picsum.photos/id/1019/1000/600/",
    thumbnail: "https://picsum.photos/id/1019/250/150/",
  },
  {
    original:
      "http://localhost:2342/api/v1/t/5b3c5b2232d546231205834496ae7f2a567037c2/45c097e5/tile_500",
    thumbnail:
      "http://localhost:2342/api/v1/t/5b3c5b2232d546231205834496ae7f2a567037c2/45c097e5/fit_2048",
  },
  {
    original:
      "http://localhost:2342/api/v1/t/a59b5326a1726eeefeedec8ad33c9cd4787de492/45c097e5/fit_2048",
    thumbnail:
      "http://localhost:2342/api/v1/t/a59b5326a1726eeefeedec8ad33c9cd4787de492/45c097e5/tile_500",
  },
];

class MyGallery extends React.Component {
  render() {
    return <ImageGallery items={images} />;
  }
}

(async () => {
  const api = ky.extend({
    hooks: {
      beforeRequest: [
        (request) => {
          request.headers.set(
            "X-Session-ID",
            "69038c14dc3a082bc0543f02a7da8a92c32f7b2a423f314b"
          );
        },
      ],
    },
  });
  const json = await api
    .get("/api/v1/photos?count=10&offset=0&merged=true")
    .json();
  console.log("photos", json);
})();

function App() {
  return (
    <div>
      <MyGallery />
    </div>
  );
}

export default App;
