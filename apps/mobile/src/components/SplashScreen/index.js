import React, {useEffect, useRef, useState} from 'react';
import {Image, View} from 'react-native';
import Animated, {Easing, timing, useValue} from 'react-native-reanimated';
import Carousel from 'react-native-snap-carousel';
import {SvgXml} from 'react-native-svg';
import {
  NOTE_SVG,
  SYNC_SVG,
  ORGANIZE_SVG,
  PRIVACY_SVG,
  COMMUNITY_SVG,
} from '../../assets/images/assets';
import {useTracked} from '../../provider';
import {eSendEvent} from '../../services/EventManager';
import {dHeight, dWidth, getElevation} from '../../utils';
import {eOpenLoginDialog} from '../../utils/Events';
import {SIZE} from '../../utils/SizeUtils';
import Storage from '../../utils/storage';
import {sleep} from '../../utils/TimeUtils';
import {Button} from '../Button';
import Heading from '../Typography/Heading';
import Paragraph from '../Typography/Paragraph';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {DDS} from '../../services/DeviceDetection';

const features = [
  {
    title: 'Notesnook',
    description: 'A safe place to write and stay organized.',
    icon: require('../../assets/images/notesnook-logo-png.png'),
    type: 'image',
  },
  {
    title: 'Made to protect your privacy',
    description:
      'Your data is encrypted on your device. No one but you can read your notes.',
    icon: PRIVACY_SVG,
    link: 'https://notesnook.com',
  },
  {
    icon: SYNC_SVG,
    title: 'While keeping you in sync',
    description:
      'Everything is automatically synced to all your devices in a safe and secure way. Notesnook is available on all major platforms.',
    link: 'https://notesnook.com',
  },
  {
    icon: ORGANIZE_SVG,
    title: 'And helping you stay organized',
    description:
      'Add your notes in notebooks and topics or simply assign tags or colors to find them easily.',
    link: 'https://notesnook.com',
  },
  {
    icon: COMMUNITY_SVG,
    title: 'Join our community',
    description:
      'We are not ghosts, chat with us and share your experience. Give suggestions, report issues and meet other people using Notesnook',
    link: 'https://discord.gg/zQBK97EE22',
  },
];
let currentIndex = 0;
const SplashScreen = () => {
  const [state, dispatch] = useTracked();
  const {colors} = state;
  const [visible, setVisible] = useState(false);
  const carouselRef = useRef();
  const [isNext, setIsNext] = useState(true);

  const opacity = useValue(0);
  const translateY = useValue(20);
  const translateY2 = useValue(0);

  useEffect(() => {
    Storage.read('introCompleted').then(async (r) => {
      requestAnimationFrame(() => {
        if (!r) {
          setVisible(true);
          timing(opacity, {
            toValue: 1,
            duration: 500,
            easing: Easing.in(Easing.ease),
          }).start();
          timing(translateY, {
            toValue: 0,
            duration: 500,
            easing: Easing.in(Easing.ease),
          }).start();
        }
      });
    });
  }, []);

  const hide = async () => {
    timing(translateY2, {
      toValue: dHeight * 2,
      duration: 500,
      easing: Easing.in(Easing.ease),
    }).start();
    await sleep(500);
    setVisible(false);
  };

  return (
    visible && (
      <Animated.View
        style={{
          zIndex: 999,
          ...getElevation(10),
          width: '100%',
          height: '100%',
          position: 'absolute',
          backgroundColor: colors.bg,
          transform: [
            {
              translateY: translateY2,
            },
          ],
        }}>
        <Animated.View
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 12,
            opacity: opacity,
            transform: [
              {
                translateY: translateY,
              },
            ],
          }}>
          <View>
            <Carousel
              ref={carouselRef}
              data={features}
              itemWidth={dWidth}
              sliderWidth={dWidth}
              loop={false}
              shouldOptimizeUpdates
              renderItem={({item, index}) => (
                <View
                  style={{
                    height: '100%',
                    justifyContent: 'center',
                  }}>
                  <View
                    key={item.description}
                    style={{
                      paddingVertical: 5,
                      marginBottom: 10,
                      alignSelf: 'center',
                    }}>
                    <View
                      style={{
                        flexWrap: 'wrap',
                        width: '100%',
                        alignItems: 'center',
                      }}>
                      {item.type === 'image' ? (
                        <Image
                          source={item.icon}
                          style={{
                            width: 170,
                            height: 170,
                          }}
                        />
                      ) : item.type === 'icon' ? (
                        <Icon color={item.color} name={item.icon} size={170} />
                      ) : (
                        <SvgXml
                          xml={
                            item.icon
                              ? item.icon(colors.accent)
                              : NOTE_SVG(colors.accent)
                          }
                          width={250}
                          height={250}
                        />
                      )}

                      {item.title && (
                        <Heading
                          size={SIZE.xl}
                          style={{
                            textAlign: 'center',
                            alignSelf: 'center',
                            marginTop: 10,
                          }}>
                          {item.title}
                        </Heading>
                      )}

                      {item.description && (
                        <Paragraph
                          size={SIZE.md}
                          color={colors.icon}
                          textBreakStrategy="balanced"
                          style={{
                            fontWeight: 'normal',
                            textAlign: 'center',
                            alignSelf: 'center',
                            maxWidth: DDS.isTab ? 350 : '80%',
                          }}>
                          {item.description}
                        </Paragraph>
                      )}

                      {item.link && (
                        <Button
                          title="Learn more"
                          fontSize={SIZE.md}
                          onPress={() => {
                            try {
                              openLinkInBrowser(item.link, colors);
                            } catch (e) {}
                          }}
                        />
                      )}
                    </View>
                  </View>
                </View>
              )}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '100%',
              position: 'absolute',
              bottom: 25,
            }}>
            {isNext ? (
              <View />
            ) : (
              <Button
                fontSize={SIZE.md}
                onPress={async () => {
                  await Storage.write('introCompleted', 'true');
                  await hide();
                }}
                height={50}
                type="grayBg"
                style={{paddingHorizontal: 24}}
                title="Skip"
              />
            )}

            <Button
              fontSize={SIZE.md}
              height={50}
              onPress={async () => {
                if (isNext) {
                  carouselRef.current?.snapToNext();
                  currentIndex++;
                  if (currentIndex === 4) {
                    setIsNext(false);
                  }
                } else {
                  await hide();
                  await Storage.write('introCompleted', 'true');
                  eSendEvent(eOpenLoginDialog, 1);
                }
              }}
              style={{paddingHorizontal: 24}}
              type="accent"
              title={isNext ? 'Next' : 'Sign up'}
            />
          </View>
        </Animated.View>
      </Animated.View>
    )
  );
};

export default SplashScreen;
