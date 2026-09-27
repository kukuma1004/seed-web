export function mountSurvivalComparison({getActive,getVariant,setVariant,getPaused,setPaused}){
 const style=document.createElement('style');style.textContent=`
 #survival-art-compare{position:fixed;z-index:85;left:50%;bottom:42px;transform:translateX(-50%);display:flex;gap:5px;align-items:center;padding:6px 9px;border:1px solid #82998088;border-radius:12px;background:#10251feb;color:#e7efd2;font:12px system-ui;box-shadow:0 3px 16px #0006}
 #survival-art-compare[hidden]{display:none}#survival-art-compare button{min-height:36px;padding:5px 10px;border:1px solid #78957d66;border-radius:7px;background:#263e33;color:#e7efd2;font:inherit;white-space:nowrap}#survival-art-compare button[aria-pressed=true]{background:#d1dea5;color:#213225;border-color:#eff8cf}
 @media(max-width:600px){#survival-art-compare{bottom:130px;font-size:10px;padding:4px;gap:3px}#survival-art-compare span{display:none}#survival-art-compare button{padding:4px 7px}}
 `;document.head.append(style);
 const panel=document.createElement('div');panel.id='survival-art-compare';panel.hidden=true;
 panel.setAttribute('role','group');panel.setAttribute('aria-label','로컬 생존전 화면 비교');
 panel.innerHTML='<span>로컬 비교</span><button data-look="classic">A · 기존</button><button data-look="quiet">B · 또렷한 숲</button><button data-freeze>장면 멈춤</button>';
 document.body.append(panel);
 for(const button of panel.querySelectorAll('[data-look]'))button.onclick=()=>{setVariant(button.dataset.look);refresh();};
 panel.querySelector('[data-freeze]').onclick=()=>{setPaused(!getPaused());refresh();};
 let previous='';
 function refresh(){const current=`${getActive()}:${getVariant()}:${getPaused()}`;if(current===previous)return;previous=current;panel.hidden=!getActive();for(const button of panel.querySelectorAll('[data-look]'))button.setAttribute('aria-pressed',String(button.dataset.look===getVariant()));panel.querySelector('[data-freeze]').textContent=getPaused()?'▶ 계속 플레이':'Ⅱ 장면 멈춤';}
 refresh();return {refresh};
}
