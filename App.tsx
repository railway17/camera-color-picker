import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert, 
  ImageBackground, 
  Dimensions, 
  Image,  
} from 'react-native'
import * as FileSystem from 'expo-file-system'
import {Camera, CameraCapturedPicture} from 'expo-camera'
import * as ImageManipulator from "expo-image-manipulator";
import { Buffer } from "buffer";
import jpeg from 'jpeg-js'
global.Buffer = Buffer; // very important

let camera: Camera
export default function App() {
  const [startCamera, setStartCamera] = React.useState(false)
  const [previewVisible, setPreviewVisible] = React.useState(false)
  const [capturedImage, setCapturedImage] = React.useState<any>(null)
  const [cameraType, setCameraType] = React.useState(Camera.Constants.Type.back)
  
  useEffect(()=> {
    __startCamera()
  }, [])

  /**
   * Make app to be ready for using camera
   */
  const __startCamera = async () => {
    const {status} = await Camera.requestCameraPermissionsAsync()

    // Decide whether let app use the camera or not.
    if (status === 'granted') {
      setStartCamera(true)
    } else {
      Alert.alert('Access denied')
    }
  }

  /**
   * Take a photo by using Camera API
   */
  const __takePicture = async () => {
    const photo: CameraCapturedPicture = await camera.takePictureAsync()
    setPreviewVisible(true)
    setCapturedImage(photo)
  }
  
  /**
   * Retake a photo
   */
  const __retakePicture = () => {
    setCapturedImage(null)
    setPreviewVisible(false)
    __startCamera()
  }

  return (
    <View style={styles.container}>
      {startCamera ? (
        <View
          style={{
            flex: 1,
            width: '100%'
          }}
        >
          {previewVisible && capturedImage ? (
            <CameraPreview photo={capturedImage} retakePicture={__retakePicture} previewVisible={previewVisible} takePicture={__takePicture}/>
          ) : (
            <Camera
              type={cameraType}
              style={{flex: 1}}
              ref={(r: Camera) => {
                camera = r
              }}
            >
              <CameraPreview photo={capturedImage} retakePicture={__retakePicture} previewVisible={previewVisible} takePicture={__takePicture}/>
            </Camera>
          )}
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            backgroundColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
        </View>
      )}

      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  }
})

const CameraPreview = ({photo, retakePicture, previewVisible, takePicture}: any) => {
  const [pickingArea, setPickingArea] = useState({width: 0, height: 0, pageX: 0, pageY: 0})
  const [imageSize, setImageSize] = useState({width: photo ? photo.width : 0, height: photo ? photo.height : 0})
  const [isDetected, setIsDetected] = useState(false)
  const [rgb, setRGB] = useState('N/A, N/A, N/A')
  const [hex, setHex] = useState('N/A')
  
  /**
   * Detect color or be ready to take a new photo
   */
  const detectColor = async () => {
    if (previewVisible) {
      
      // Crop taken photo by PickingArea size, which will be analyzied
      const uri = await cropFrame(photo.uri)

      // Convert the uri to base64 to initialize the image buffer
      const base64 = await FileSystem.readAsStringAsync(uri,
        { encoding: FileSystem.EncodingType.Base64 });
      const jpegData = Buffer.from(base64, 'base64');

      // Decode jpeg buffer to bmp buffer
      const rawImageData = jpeg.decode(jpegData);
      const clampedArray = new Uint8ClampedArray(rawImageData.data);

      // Convert Bytes array to RGB
      const rgb = convertBytesToRGBArray(clampedArray)
      const hexValue = rgb2hex(rgb)
      setRGB(`${rgb.r}, ${rgb.g}, ${rgb.b}`)
      setHex(`#${hexValue}`)
      setIsDetected(true)
    } else {
      takePicture()
      setRGB('N/A, N/A, N/A')
      setHex('N/A')
    }
  }
  
  /**
   * Crop frame that will be analyzed
   * @param {String} uri 
   * @returns {String}
   */
  const cropFrame = async (uri: any) => {
    const dpiWidth = Dimensions.get("window").width
    const dpiHeight = Dimensions.get("window").height
    const widthRatio = Number.parseFloat((imageSize.width / dpiWidth).toFixed(3))
    const heightRatio = Number.parseFloat((imageSize.height / dpiHeight).toFixed(3))

    // Crop image by defined crop area
    const result = await ImageManipulator.manipulateAsync(uri, [
      {
        crop: {
          originX: pickingArea.pageX * widthRatio,
          originY: pickingArea.pageY * heightRatio,
          width: pickingArea.width * widthRatio,
          height: pickingArea.height * heightRatio
        },
      },
    ]);
  
    return result.uri;
  };

  /**
   * Define picking area when PickingArea is mounted
   * @param pageX 
   * @param pageY 
   * @param width 
   * @param height 
   */
  const detectPickingArea = (pageX: number, pageY: number, width: number, height: number) => {
    setPickingArea({width, height, pageX, pageY})
  }

  /**
   * Retake photo
   */
  const retakePhoto = () => {
    setIsDetected(false)
    retakePicture()
  }

  return (
    <View
      style={{
        backgroundColor: 'transparent',
        flex: 1,
        width: '100%',
        height: '100%',
      }}
    >
      <ImageBackground
        source={{uri: photo && photo.uri}}
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            backgroundColor: 'white',
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '90%',
            padding: 16,
            alignItems: 'center',
            marginTop: '10%',
            marginLeft: '5%',
            borderRadius: 12
          }}
        >
          <View>
            <Text>{isDetected ? 'Color Detected' : 'Waiting'}</Text>
            <Text style={{fontWeight: 'bold'}}>RGB: {rgb}</Text>
            <Text>Hex: {hex}</Text>
          </View>
          <View>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 2,
                borderWidth: 1,
                borderColor: 'black',
                backgroundColor: hex != 'N/A' ? hex : 'transparent'
              }}
            >
            </View>
          </View>
        </View>
        <View
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center'
          }}
          >
          <PickArea setPickingArea={detectPickingArea} isDetected={isDetected}/>
        </View>
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
            padding: 15,
            justifyContent: 'flex-end'
          }}
        >
          <View 
            style={{
              flexDirection: 'row-reverse',
            }}
          >
            <TouchableOpacity
              onPress={retakePhoto}
              style={{
                display: !isDetected ? 'none' : 'flex',
                width: '46%',
                height: 50,
                marginLeft: '5%',
                marginBottom: 40,
                padding: 8,
                backgroundColor: '#24d483',
                alignItems: 'center',
                borderRadius: 8
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 20
                }}
              >
                {'Retake'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={detectColor}
              style={{
                width: !isDetected ? '100%' : '46%',
                height: 50,
                marginLeft: '5%',
                marginBottom: 40,
                padding: 8,
                backgroundColor: '#24d483',
                alignItems: 'center',
                borderRadius: 8
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 20
                }}
              >
                {!isDetected && previewVisible ? 'Detect Color' : 'Take Picture'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  )
}

const PickArea = ({setPickingArea, isDetected}: any) => {
  // Define area with and height by assuming define dynamically in the future
  const [areaWidth, setAreaWidth] = useState(60)
  const [areaHeight, setAreaHeight] = useState(60)
  const pickingRef = useRef(null)
  return (
    <View
      ref={pickingRef}
      style={{
        backgroundColor: 'transparent',
        width: areaWidth,
        height: areaHeight,
        borderStyle: 'dotted',
        borderRadius: 2,
        borderWidth: 2,
        borderColor: 'red',
        marginTop: 40,
      }}
      onLayout={(evt: any)=> {
        if (pickingRef.current) {
          pickingRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
            setPickingArea(pageX, pageY, width, height)
          })
        }
      }}
    >
    </View>
  )
}

/**
 * Convert from RGB to HEX
 * @param rgb 
 * @returns {String}
 */
const rgb2hex = (rgb: any) => {
  return (rgb.r | 1 << 8).toString(16).slice(1) +
    (rgb.g | 1 << 8).toString(16).slice(1) +
    (rgb.b | 1 << 8).toString(16).slice(1)
}

/**
 * Calculate the average RGB based on the logic that bytearray is RGBA value array
 * @param bytesData 
 * @returns {Object}
 */
const convertBytesToRGBArray = (bytesData: Uint8ClampedArray) => {
  const colorLengh = bytesData.length
  let nR = 0, nG = 0, nB = 0

  // Calculate the sum of R, G, B values by stepping +4 (r, g, b, a)
  for(let i = 0; i < colorLengh; i+=4) {
    nR += bytesData[i]
    nG += bytesData[i + 1];
    nB += bytesData[i + 2];
  }
  
  // Calculate average color divide by colorLengh
  const nPixCount = colorLengh / 4;
  nR /= nPixCount
  nG /= nPixCount
  nB /= nPixCount
  return {r: Math.floor(nR), g: Math.floor(nG), b: Math.floor(nB)}
}


