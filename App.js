import React, {Component, Fragment} from 'react';
import {
  Platform, 
  Text, 
  View,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Alert,
  FlatList,
  Picker,
  //Slider,
  //Keyboard,
  //TextInput,
  Dimensions,
  NativeModules
} from 'react-native';
import NfcManager, {Ndef} from 'react-native-nfc-manager';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-community/async-storage';
import { Button, Overlay, Slider } from 'react-native-elements';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import IconMaterial from 'react-native-vector-icons/MaterialIcons'
import style from './scripts/style';

const RtdType = {
  URL: 0,
  TEXT: 1,
};

function buildTextPayload(valueToWrite) {
  return Ndef.encodeMessage([
      Ndef.textRecord(valueToWrite),
  ]);
}

type Props = {};
export default class App extends Component<Props> 
{
  
  state = {
    voices: [],
    ttsStatus: "initiliazing",
    selectedVoice: null,
    speechRate: 0.5,
    speechPitch: 1,
    text: "Renca te guía",
    NFC_supported: true,
    NFC_enabled: false,
    NFC_isWriting: false,
    NFC_urlToWrite: 'Proyecto NFC Renca',
    NFC_rtdType: RtdType.TEXT,
    NFC_parsedText: null,
    NFC_tag: {},
    isAfterTagRead: false,
    isConfigVisible: false,
    countTap: 2,
    currCountTap: 0,
    Picker_currValue: null,
    timeoutID: null,
    currValuePitchSlider: null,
    currValueRateSlider: null,
    currVoicePicker: null,
  };

  constructor(props) 
  {
    super(props);
   
    Tts.addEventListener("tts-start", event =>
      this.setState({ ttsStatus: "started" })
    );
    Tts.addEventListener("tts-finish", event =>
      this.setState({ ttsStatus: "finished" })
    );
    Tts.addEventListener("tts-cancel", event =>
      this.setState({ ttsStatus: "cancelled: " + JSON.stringify(event)})
    );

    Tts.getInitStatus().then(this.initTts).then(this.getData).then(this._initConfig);
  }

  componentDidMount() {
    NfcManager.isSupported()
        .then(NFC_supported => {
            this.setState({ NFC_supported });
            if (NFC_supported) {
                this._startNfc();
            }
        })
  }

  componentWillUnmount() {
      if (this._stateChangedSubscription) {
          this._stateChangedSubscription.remove();
      }
  }

  //#region TTS

  /**
   * Inicializar text to speech
   */
  initTts = async () => {
    const voices = await Tts.voices();
    const availableVoices = voices
      .filter(v => !v.networkConnectionRequired && !v.notInstalled)
      .map(v => {
        return { id: v.id, name: v.name, language: v.language };
      });

    const voicesLanguageDevice = this._getVoicesCurrentLanguageDevice(availableVoices);

    let selectedVoice = null;
    if (voicesLanguageDevice && voicesLanguageDevice.length > 0) {
      selectedVoice = voicesLanguageDevice[0].id;
      try {
        await Tts.setDefaultLanguage(voicesLanguageDevice[0].language);
      } catch (err) {
        // My Samsung S9 has always this error: "Language is not supported"
        console.log(`setDefaultLanguage error `, err);
      }
      await Tts.setDefaultVoice(voicesLanguageDevice[0].id);
      this.setState({
        voices: voicesLanguageDevice,
        selectedVoice,
        ttsStatus: "initialized"
      });
    } else {
      this.setState({ ttsStatus: "initialized" });
    }
    console.log("Finish initTts");
  };

  /**
   * Obtener las arreglo de voces de acuerdo al lenguaje primario del 
   * dispositivo.
   * @param {Arreglo que contiene las voces disponibles en el dispositivo} currVoices 
   */
  _getVoicesCurrentLanguageDevice(currVoices)
  {
    let languageDevice = this._getLanguageDevice();

     return (currVoices.filter(v => v.language.substring(0, 2).toLowerCase() == languageDevice.toLowerCase()).map(v => {
      return { id: v.id, name: v.name, language: v.language };
    }));
  }

  /**
   * Obtener lenguaje del dispositivo. Se obtienen
   * las dos primeras letras.
   */
  _getLanguageDevice()
  {
    let systemLanguage = 'es';
    if(Platform.OS == 'android')
    {
      systemLanguage = NativeModules.I18nManager.localeIdentifier;
    }
    if(Platform.OS == 'ios')
    {
      systemLanguage = NativeModules.SettingsManager.settings.AppleLocale;
    }

    const languageCode = systemLanguage.substring(0, 2);

    return languageCode;
  }

  /**
   * Leer texto en audio. 
   */
  readText = async () => {
    Tts.stop();
    Tts.speak(this.state.text);
  };

  /**
   * Detener audio.
   */
  stopText = async () => {
    Tts.stop();
  };

  /**
   * Modificar rate de la voz
   */
  setSpeechRate = async rate => {
    await Tts.setDefaultRate(rate);
    this.setState({ speechRate: rate });
  };

  /**
   * Modificar pitch de la voz
   */
  setSpeechPitch = async rate => {
    await Tts.setDefaultPitch(rate);
    this.setState({ speechPitch: rate });
  };

  /**
   * Modificar voz actual
   */
  setVoice = async voice => {
    try {
      await Tts.setDefaultLanguage(voice.language);
    } catch (err) {
      // My Samsung S9 has always this error: "Language is not supported"
      console.log(`setDefaultLanguage error `, err);
    }
    await Tts.setDefaultVoice(voice.id);
    this.setState({ selectedVoice: voice.id });
  };
  //#endregion

  //#region Storage_Data

  /**
   * Guardar datos en el dispositivo
   */
  storeData = async () => {
    try {
      await AsyncStorage.setItem('@AUDIO_Speed', JSON.stringify(this.state.speechRate))
      await AsyncStorage.setItem('@AUDIO_Pitch', JSON.stringify(this.state.speechPitch))
      await AsyncStorage.setItem('@AUDIO_Voice', this.state.selectedVoice)

      console.log("store speed: " + this.state.speechRate);
      console.log("store pitch: " + this.state.speechPitch);
    } catch (e) {
      // saving error
      console.log("saving error: " + e)
    }
  }

  /**
   * Obtener datos guardados en el dispositivo
   */
  getData = async () => 
  {
    try {
      const speedValue = await AsyncStorage.getItem('@AUDIO_Speed')
      const pitchValue = await AsyncStorage.getItem('@AUDIO_Pitch')
      const voiceValue = await AsyncStorage.getItem('@AUDIO_Voice')

      console.log("Get speed: " + speedValue);
      console.log("Get pitch: " + pitchValue);
      console.log("Get voice: " + voiceValue.id);

      if(speedValue !== null) 
      {
        this.setState({ speechRate: parseFloat(speedValue)});       
      }
      if(pitchValue !== null) 
      {
        this.setState({ speechPitch: parseFloat(pitchValue)});
      }
      if(voiceValue !== null) 
      {
        // Verificar si existe la voz guardada debido a que el usuario puede cambiar de idioma.
        let isVoiceExist = this.state.voices.filter(v => v.id == voiceValue).map(v => {
          return { id: v.id, name: v.name, language: v.language };
        })

        if(isVoiceExist.length > 0) 
        {
          this.setState({ selectedVoice: voiceValue});
        }
      }
    } catch(e) {
      // error reading value
      console.log("reading error: " + e)
    }
  }

  //#endregion

  //#region NFC

  /**
   * Iniciar escritura en tag nfc.
   */
  _requestNdefWrite = () => {
      let {NFC_isWriting, NFC_urlToWrite, NFC_rtdType} = this.state;

      if (NFC_isWriting) 
      {
          return;
      }

      this._startDetection();

      let bytes;

      if(NFC_rtdType === RtdType.TEXT) 
      {
          bytes = buildTextPayload(this.state.text);
      }

      this.setState({NFC_isWriting: true});
      NfcManager.requestNdefWrite(bytes)
          .then(() => console.log('write completed'))
          .catch(err => console.warn(err))
          .then(() => this.setState({NFC_isWriting: false}));
  }

  /**
   * Cancelar escritura tag nfc.
   */
  _cancelNdefWrite = () => {
      this.setState({NFC_isWriting: false});
      NfcManager.cancelNdefWrite()
          .then(() => console.log('write cancelled'))
          .catch(err => console.warn(err))
  }

  /**
   * Inicializar NFC en el dispositivo
   */
  _startNfc() {
    console.log("start nfc");
      NfcManager.start({
          onSessionClosedIOS: () => {
              console.log('ios session closed');
          }
      })
          .then(result => {
              console.log('start OK', result);
          })
          .catch(error => {
              console.warn('start fail', error);
              this.setState({NFC_supported: false});
          })

      if (Platform.OS === 'android') {
          NfcManager.getLaunchTagEvent()
              .then(NFC_tag => {
                  console.log('launch tag', NFC_tag);
                  if (NFC_tag) 
                  {
                      /*
                      * Se ha detectado un tag al iniciar la aplicacion
                      * Aca ocurre la lectura en Android
                      */
                      this.setState({ NFC_tag });
                      let text = this._parseText(NFC_tag);
                      this.setState({NFC_parsedText: text});

                      //Iniciar lectura en audio del texto 
                      this.setState({text: this._parseText(NFC_tag)});
                      //Iniciar lectura en audio del texto      
                      //this._readNFCTagText();    
                      Tts.getInitStatus().then(this.initTts).then(this.getData).then(this._initConfig).then(this._readNFCTagText);                
                  }
              })
              .catch(err => {
                  console.log('fail start: ' + err);
              })
          NfcManager.isEnabled()
              .then(NFC_enabled => {
                  this.setState({ NFC_enabled });
              })
              .catch(err => {
                  console.log(err);
              })
          NfcManager.onStateChanged(
              event => {
                  if (event.state === 'on') {
                      this.setState({NFC_enabled: true});
                  } else if (event.state === 'off') {
                      this.setState({enabled: false});
                  } else if (event.state === 'turning_on') {
                      // do whatever you want
                  } else if (event.state === 'turning_off') {
                      // do whatever you want
                  }
              }
          )
              .then(sub => {
                  this._stateChangedSubscription = sub; 
                  // remember to call this._stateChangedSubscription.remove()
                  // when you don't want to listen to this anymore
              })
              .catch(err => {
                  console.warn(err);
              })
      }
  }

  /**
   * Al descubrir un nuevo tag, activa la lectura por audio del texto almacenado
   * en el tag.
   */
  _onTagDiscovered = NFC_tag => {
      console.log('Tag Discovered', NFC_tag);

      /*
      * Se ha detectado un tag al iniciar la aplicacion
      */
      this.setState({ NFC_tag });
      let text = this._parseText(NFC_tag);
      this.setState({NFC_parsedText: text});

      this.setState({text: this._parseText(NFC_tag)});

      if (Platform.OS === 'ios')
      {
        // Cerrar ventana de lectura nfc
        // luego se espera un segundo para esperar el cierre
        // de la interfaz de nfc para posteriormente 
        //iniciar lectura en audio del texto 
        NfcManager.unregisterTagEvent()
          .then(result => {
              console.log('unregisterTagEvent OK', result);   
          })
          .catch(error => {
              console.warn('unregisterTagEvent fail', error)
          }).then(setTimeout(this._readNFCTagText, 1000));

      }else
      {
        // Android
        //Iniciar lectura en audio del texto      
        this._readNFCTagText();
      }  
  }

  /**
   * Iniciar detection de NFC.
   */
  _startDetection = () => 
  {
    
    console.log('star detection');
      NfcManager.registerTagEvent(
        this._onTagDiscovered,
        'Mantén tu dispositivo sobre el tag NFC',
        {
          //invalidateAfterFirstRead: true
        }      
        )
          .then(result => {
              console.log('registerTagEvent OK', result)
          })
          .catch(error => {
              console.warn('registerTagEvent fail', error)
          })
  }

  /**
   * Detener deteccion de NFC
   */
  _stopDetection = () => {
      NfcManager.unregisterTagEvent()
          .then(result => {
              console.log('unregisterTagEvent OK', result)             
          })
          .catch(error => {
              console.warn('unregisterTagEvent fail', error)
          })
  }

  _clearMessages = () => {
      this.setState({NFC_tag: null});
  }

  /**
   * Obtener texto desde un tag.
   */
  _parseText = (NFC_tag) => {
      try {
          if (Ndef.isType(NFC_tag.ndefMessage[0], Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
              return Ndef.text.decodePayload(NFC_tag.ndefMessage[0].payload);
          }
      } catch (e) {
          console.log(e);
      }
      return null;
  }

  //#endregion

  //#region Application_Renca
  _initConfig = async () =>
  {
    console.log("Init Config");
    Tts.setDefaultVoice(this.state.selectedVoice);
    Tts.setDefaultPitch(this.state.speechPitch);
    Tts.setDefaultRate(this.state.speechRate);

    //Iniciar lectura de tag nfc
    if(Platform.OS == 'ios')
    {
      this._startDetection();
    }

    // TODO Mostrar alerta si el dispositivo no soporta nfc o lo tiene desactivado
  }

  _readNFCTagText = async() => 
  {
    this.setState({isAfterTagRead: true});

    Tts.stop();
    Tts.speak(this.state.text); 
  };

  //#endregion

  //#region UI_Behaviour
  OpenWindowConfig = () =>
  {
    if(this.state.currCountTap == 0)
    {
      this.state.timeoutID = setTimeout(()=> this.setState({currCountTap: 0}), 500);
    }
  
    this.state.currCountTap++;

    if(this.state.currCountTap === this.state.countTap)
    {
      // Abrir configuraciones
      clearTimeout(this.state.timeoutID);

      this.setState({ isConfigVisible: true, timeoutID: null });
      this.setState({ currCountTap: 0 });

      this.setState({currValuePitchSlider: this.state.speechPitch});
      this.setState({currValueRateSlider: this.state.speechRate});
      this.setState({Picker_currValue: this.state.selectedVoice});
    }
  }

  OnCloseWindowConfig = (isSave) =>
  {
    // close window
    this.setState({ isConfigVisible: false, currCountTap: 0  });

    // Guardar valores
    if(isSave)
    {
      this.setSpeechPitch(this.state.currValuePitchSlider);
      this.setSpeechRate(this.state.currValueRateSlider);
      this.setVoice(this.state.currVoicePicker);

      this.storeData();
    }
  }

  pickerChange(index){
    this.state.voices.map( (v,i)=>{
      if( index === i ){
        this.setState({
          Picker_currValue: this.state.voices[index].id,
          currVoicePicker: this.state.voices[index]
        })
      }
    })
   }
  //#endregion

  //#region Render
  render() 
  {
    return (
      <SafeAreaView forceInset={{ top: 'always' }} style={{ backgroundColor: '#F5FCFF', flex: 1}}>
        <View style={style.container}>
          <View style={style.header}>
            <View style={style.row}>
              <View style={{justifyContent: 'center', alignItems: 'flex-end', flex:1}}>
                <Button
                  icon={
                    <Icon
                      name="cog"
                      size={30}
                      color="#cccccc"
                    />
                  }
                  type='clear'
                  onPress={ this.OpenWindowConfig} 
                />
              </View>
            </View>
          </View>
          <View style={style.content}>
            {this.state.isAfterTagRead ? 
            (
              // Mostrar texto alojado en el chip nfc. Mostrar botones.
              <View style={style.column}>
                <View style={{justifyContent: 'center',  alignItems: 'center', flex:1, backgroundColor: '#F5FCFF',}}>
                  <Text style={[style.instructions, {margin:30, fontSize: Dimensions.get('window').width * 0.05}]}>{this.state.text}</Text>
                </View>
                <View style={{justifyContent: 'center', alignItems: 'flex-end', flex:.1,}}>
                  <Button
                    icon={
                      <Icon
                        name="volume-up"
                        size={30}
                        color="black"
                      />
                    }
                    type="clean"
                    onPress ={this.readText}
                    // onPress={()=> Alert.alert(
                    //   'Alert Title',
                    //   'My Alert Msg',
                    //   [
                    //     {text: 'Ask me later', onPress: () => console.log('Ask me later pressed')},
                    //     {
                    //       text: 'Cancel',
                    //       onPress: () => console.log('Cancel Pressed'),
                    //       style: 'cancel',
                    //     },
                    //     {text: 'OK', onPress: () => console.log('OK Pressed')},
                    //   ],
                    //   {cancelable: false},
                    // )} 
                  />
                </View>
              </View>         
            ) : 
            (
              // Lectura nfc
              Platform.select({
                ios: null,
                android: 
                  <View style={style.contentImage}>
                      <Image
                      style={{width: 400 , height: 400}}
                      source={require('./resources/images/circle.png')}
                      />
                      <View style={{position: 'absolute', height: 200, width: 200, justifyContent: 'center', alignItems: 'center'}}>
                        <Text style={{fontSize: 20, textAlign: 'center',}}>
                          Acerca el celular al tag NFC
                        </Text>
                      </View>
                </View>
              })               
            )}            
          </View>
          
          <View style={style.footer}>
            {
              Platform.select({
                ios: 
                // Boton leer tag (IOS). 
                <TouchableOpacity
                style={[style.button, style.bottom]}
                onPress={this._startDetection}
                >
                  <IconMaterial
                        name="speaker-phone"
                        size={60}
                        color="black"
                  />
                  <Text style={style.instructions}> Leer Tag</Text>
                </TouchableOpacity>
                ,
                android:
                  this.state.isAfterTagRead ?
                  (
                  //  Mostrar mensaje de lectura (android)
                  <Button
                  title='Acerca el celular para leer el tag NFC'
                  type='outline'
                  containerStyle={[{backgroundColor:'#F5FCFF',}, style.bottom]}
                  disabled={true}
                  />
                  )
                  :
                  (null) 
                ,
              })
            }            
          </View>
            
          <Overlay
            isVisible={this.state.isConfigVisible}
            onBackdropPress={() => this.setState({ isConfigVisible: false })}
            height='auto'
            width='auto'
            overlayStyle={style.containerOverlay}
          >
            <Fragment>
              <View style={{flexDirection: 'column', justifyContent: "center", alignItems: 'center',}}>
                <Text style={style.title}>Configuraciones de Audio</Text>
                  
                  <Slider
                    style={style.slider}
                    trackStyle={style.trackSlider}
                    thumbStyle={style.thumbSlider}
                    minimumTrackTintColor='#30a935'
                    minimumValue={0.55}
                    maximumValue={1.95}
                    value={this.state.currValuePitchSlider}
                    onValueChange={value => this.setState({currValuePitchSlider: value })}
                  />

                  <Text
                    style={style.labelSlider}> 
                    {`Tono`}
                  </Text>
                  <View style={{marginBottom: 15,}}>
                    <Slider
                      style={style.slider}
                      trackStyle={style.trackSlider}
                      thumbStyle={style.thumbSlider}
                      minimumTrackTintColor='#30a935'
                      value={this.state.currValueRateSlider}
                      onValueChange={value => this.setState({currValueRateSlider: value })}
                      minimumValue={0.019}
                      maximumValue={0.98}
                    />

                    <Text
                      style={style.labelSlider}>
                      {`Velocidad`}
                    </Text>
                  </View>
                  <Picker
                  selectedValue={this.state.Picker_currValue }
                  style={{ width: 150, height: 44,}} itemStyle={{height: 44}}
                  onValueChange={(itemValue, itemIndex) => this.pickerChange(itemIndex)}>{
                    this.state.voices.map( (v)=>{
                    return <Picker.Item label={v.name} value={v.id} />
                    })
                  }
                  </Picker>
                  <Text
                    style={style.labelSlider}>
                    {`Voces`}
                  </Text>

              </View>
              <View style={{height: 30, backgroundColor: 'white'}}></View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between',}}>
                    <Button
                      ViewComponent={LinearGradient}
                      linearGradientProps={{
                        colors: ['#f01616', '#f01616'],
                        start: { x: 0, y: 0 },
                        end: { x: 1, y: 1 },
                      }}
                      icon={
                        <Icon
                          name="times-circle"
                          size={22}
                          color="white"
                        />
                      }
                      title="Cancelar"
                      onPress={() => this.OnCloseWindowConfig(false)} 
                      //onPress={() => this.setState({ isAfterTagRead: false})} 
                    />

                    <Button
                      ViewComponent={LinearGradient} 
                      linearGradientProps={{
                        colors: ['#1aa338', '#1aa338'],
                        start: { x: 0, y: 0 },
                        end: { x: 1, y: 1 },
                      }}
                      icon={
                        <Icon
                          name="check-circle"
                          size={22}
                          color="white"
                        />
                      }
                      title="Aceptar"
                      color="black"
                      onPress={() => this.OnCloseWindowConfig(true)} 
                      //onPress={() => this.setState({ isAfterTagRead: true })} 
                    />
              </View>
            </Fragment>
          </Overlay>
        </View>
      </SafeAreaView>
      /*
      <View style={styles.container}>
        <Text style={styles.title}>{`NFC Renca`}</Text>

        <Button title={`start nfc`} onPress={this._startDetection} />
        <Button title={`Read text`} onPress={this.readText} />

        <Text style={styles.label}>{`Status: ${this.state.ttsStatus ||
          ""}`}</Text>

        <Text style={styles.label}>{`Selected Voice: ${this.state
          .selectedVoice || ""}`}</Text>

        <View style={styles.sliderContainer}>
          <Text
            style={styles.sliderLabel}
          >{`Speed: ${this.state.speechRate.toFixed(2)}`}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.01}
            maximumValue={0.99}
            value={this.state.speechRate}
            onSlidingComplete={this.setSpeechRate}
          />
        </View>       

        <View style={styles.sliderContainer}>
          <Text
            style={styles.sliderLabel}
          >{`Pitch: ${this.state.speechPitch.toFixed(2)}`}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2}
            value={this.state.speechPitch}
            onSlidingComplete={this.setSpeechPitch}
          />
        </View>

        <Button title={`Write text`} onPress={this._requestNdefWrite} />
        
          <TextInput
            style={styles.textInput}
            multiline={true}
            onChangeText={text => this.setState({ text })}
            value={this.state.text}
            onSubmitEditing={Keyboard.dismiss}
          />
          
        <View style={styles.textInput}>
        <FlatList
          keyExtractor={item => item.id}
          renderItem={this.renderVoiceItem}
          extraData={this.state.selectedVoice}
          data={this.state.voices}
        />
        </View>
      </View>
      */
    );
  }
  //#endregion
} 