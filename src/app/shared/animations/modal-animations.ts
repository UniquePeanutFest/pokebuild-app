import { Animation, createAnimation } from '@ionic/angular';

export const modalEnterAnimation = (baseEl: HTMLElement): Animation => {
  const backdropAnimation = createAnimation()
    .addElement(baseEl.querySelector('ion-backdrop')!)
    .fromTo('opacity', '0.01', 'var(--backdrop-opacity)');

  const wrapperAnimation = createAnimation()
    .addElement(baseEl.querySelector('.modal-wrapper')!)
    .fromTo('opacity', '0', '1')
    .fromTo('transform', 'scale(0.95) translateY(10px)', 'scale(1) translateY(0px)');

  return createAnimation()
    .addElement(baseEl)
    .easing('cubic-bezier(0.25, 0.46, 0.45, 0.94)')
    .duration(200)
    .addAnimation([backdropAnimation, wrapperAnimation])
    .beforeAddClass('show-modal')
    .afterAddWrite(() => {
      // Asegurar que el modal sea accesible
      const modal = baseEl.querySelector('ion-modal');
      if (modal) {
        modal.removeAttribute('aria-hidden');
      }
    });
};

export const modalLeaveAnimation = (baseEl: HTMLElement): Animation => {
  const backdropAnimation = createAnimation()
    .addElement(baseEl.querySelector('ion-backdrop')!)
    .fromTo('opacity', 'var(--backdrop-opacity)', '0.01');

  const wrapperAnimation = createAnimation()
    .addElement(baseEl.querySelector('.modal-wrapper')!)
    .fromTo('opacity', '1', '0')
    .fromTo('transform', 'scale(1) translateY(0px)', 'scale(0.95) translateY(10px)');

  return createAnimation()
    .addElement(baseEl)
    .easing('cubic-bezier(0.25, 0.46, 0.45, 0.94)')
    .duration(150)
    .addAnimation([backdropAnimation, wrapperAnimation])
    .beforeRemoveClass('show-modal');
};

export const slideInFromRight = (baseEl: HTMLElement): Animation => {
  const backdropAnimation = createAnimation()
    .addElement(baseEl.querySelector('ion-backdrop')!)
    .fromTo('opacity', '0.01', 'var(--backdrop-opacity)');

  const wrapperAnimation = createAnimation()
    .addElement(baseEl.querySelector('.modal-wrapper')!)
    .fromTo('opacity', '0', '1')
    .fromTo('transform', 'translateX(100%)', 'translateX(0)');

  return createAnimation()
    .addElement(baseEl)
    .easing('cubic-bezier(0.25, 0.46, 0.45, 0.94)')
    .duration(250)
    .addAnimation([backdropAnimation, wrapperAnimation]);
};

export const slideOutToRight = (baseEl: HTMLElement): Animation => {
  const backdropAnimation = createAnimation()
    .addElement(baseEl.querySelector('ion-backdrop')!)
    .fromTo('opacity', 'var(--backdrop-opacity)', '0.01');

  const wrapperAnimation = createAnimation()
    .addElement(baseEl.querySelector('.modal-wrapper')!)
    .fromTo('opacity', '1', '0')
    .fromTo('transform', 'translateX(0)', 'translateX(100%)');

  return createAnimation()
    .addElement(baseEl)
    .easing('cubic-bezier(0.25, 0.46, 0.45, 0.94)')
    .duration(200)
    .addAnimation([backdropAnimation, wrapperAnimation]);
};

export const bounceInAnimation = (baseEl: HTMLElement): Animation => {
  const backdropAnimation = createAnimation()
    .addElement(baseEl.querySelector('ion-backdrop')!)
    .fromTo('opacity', '0.01', 'var(--backdrop-opacity)');

  const wrapperAnimation = createAnimation()
    .addElement(baseEl.querySelector('.modal-wrapper')!)
    .keyframes([
      { offset: 0, opacity: '0', transform: 'scale(0.3)' },
      { offset: 0.5, opacity: '1', transform: 'scale(1.05)' },
      { offset: 0.7, opacity: '1', transform: 'scale(0.95)' },
      { offset: 1, opacity: '1', transform: 'scale(1)' }
    ]);

  return createAnimation()
    .addElement(baseEl)
    .easing('cubic-bezier(0.68, -0.55, 0.265, 1.55)')
    .duration(400)
    .addAnimation([backdropAnimation, wrapperAnimation]);
};

export const bounceOutAnimation = (baseEl: HTMLElement): Animation => {
  const backdropAnimation = createAnimation()
    .addElement(baseEl.querySelector('ion-backdrop')!)
    .fromTo('opacity', 'var(--backdrop-opacity)', '0.01');

  const wrapperAnimation = createAnimation()
    .addElement(baseEl.querySelector('.modal-wrapper')!)
    .keyframes([
      { offset: 0, opacity: '1', transform: 'scale(1)' },
      { offset: 0.3, opacity: '1', transform: 'scale(1.05)' },
      { offset: 1, opacity: '0', transform: 'scale(0.3)' }
    ]);

  return createAnimation()
    .addElement(baseEl)
    .easing('cubic-bezier(0.68, -0.55, 0.265, 1.55)')
    .duration(300)
    .addAnimation([backdropAnimation, wrapperAnimation]);
};
