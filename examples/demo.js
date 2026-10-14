/* Спільна логіка для прикладів: звук кнопок, форма заявки (демо), таймер */
(function(){
  var ac;function beep(f,d,t){try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();var o=ac.createOscillator(),g=ac.createGain(),n=ac.currentTime;o.type=t||"triangle";o.frequency.setValueAtTime(f,n);g.gain.setValueAtTime(.12,n);g.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(g);g.connect(ac.destination);o.start(n);o.stop(n+d)}catch(e){}}
  document.addEventListener("click",function(e){var b=e.target.closest(".b,summary");if(b)beep(b.classList.contains("alt")?660:880,.12)});
  document.querySelectorAll("form.f").forEach(function(f){f.addEventListener("submit",function(e){e.preventDefault();
    var bad=[].some.call(f.querySelectorAll("[required]"),function(i){return !i.value.trim()});
    if(bad){beep(200,.25,"sawtooth");alert("Заповніть, будь ласка, обов'язкові поля");return}
    [523,659,784,1047].forEach(function(x,i){setTimeout(function(){beep(x,.2)},i*90)});
    f.style.display="none";var ok=f.nextElementSibling;if(ok)ok.style.display="block"})});
  var t=document.getElementById("timer");if(t){var end=Date.now()+((5*60+47)*60+12)*1000;
    (function tick(){var s=Math.max(0,Math.floor((end-Date.now())/1000)),p=[Math.floor(s/3600),Math.floor(s%3600/60),s%60];
      t.querySelectorAll("b").forEach(function(el,i){el.textContent=String(p[i]).padStart(2,"0")});setTimeout(tick,1000)})()}
  // якщо сторінку відкрито в iframe на головному сайті — ховаємо демо-плашку
  if(window.top!==window.self){var bar=document.querySelector(".demo-bar");if(bar)bar.style.display="none"}
})();
