import {
	html, css, BaseElement, ScrollbarStyle, SpinnerStyle, UID
} from './flow-ux.js';
export * from './flow-ux.js';
import {validatePassword, baseUrl, debug, isMobile} from './wallet.js';
export * from './wallet.js';
export {baseUrl, debug};
const historyStack = [];

if(isMobile){
	window.addEventListener("popstate", (e)=>{
		let state = historyStack.pop();
		let ce = new CustomEvent("_popstate", {detail:{state:e.state, oldState:state}})
		window.dispatchEvent(ce)
	});
}

export class AnumaDialog extends BaseElement{

	static get properties() {
		return {
			errorMessage:{type:String},
			hideable:{type:Boolean, reflect:true}
		};
	}

	static get styles(){
		return [ScrollbarStyle, SpinnerStyle, css`
			:host{
				z-index:-10;opacity:0;
				position:var(--anuma-dialog-position, absolute);
				top:0px;
				left:0px;
				width:100%;
				height:100%;
				background-color:var(--anuma-dialog-bg-color);
				box-sizing:border-box;
				font-family: "Open Sans", sans-serif;
				display:none;
				align-items:center;
				justify-content:center;
				--flow-menu-item-bg:#EFEFEF;
			}
			flow-btn{vertical-align:bottom;margin-bottom:5px;}
			flow-input flow-btn{margin-bottom:0px;}
			:host(.active){opacity:1;z-index:100000;display:flex;}
			.container{
				box-sizing:border-box;
				width:100%;
				height:var(--anuma-dialog-container-height, calc(100% - 10px));
				background-color:var(--flow-background-color, #F00);
				z-index:1;
				border:var(--anuma-dialog-container-border, 2px solid var(--flow-primary-color));
				border-radius:var(--anuma-dialog-container-border-radius, 3px);
				max-width:var(--anuma-dialog-container-max-width, 700px);
				max-height:var(--anuma-dialog-container-max-height, 300px);
				margin:var(--anuma-dialog-container-margin, 5px auto);
				padding:var(--anuma-dialog-container-padding, 0px);
				position:relative;
				display:flex;flex-direction:column;
			}
			.close-btn{
			    color:var(--flow-dialog-close-btn-color, var(--flow-color));
			    position:absolute;
			    right:15px;
			    top:15px;
			    font-size:var(--flow-dialog-close-btn-font-size, 1.5rem);
			    cursor:pointer;z-index:2;
			    line-height:0px;display:none;
			}
			:host([hideable]) .close-btn{
				display:var(--anuma-dialog-container-close-btn-display, inline-block)
			}
			.heading{
				margin:0px;padding:5px 10px;font-size:1rem;min-height:30px;
				display:flex;align-items:center;
				border-bottom:2px solid var(--flow-primary-color, #F00);
			}
			.heading-init{
				min-height:0px;
				border-bottom:none;
			}
			.flex{flex:1}
			.sub-heading{padding:5px;font-size:1.2rem;}
			.body{flex:1;display:flex;justify-content:center;overflow:hidden auto;}
			.inner-body{max-width:90%;width:700px;height:fit-content;padding:30px;}
			.full-width{width:100%;max-width:100%;}
			.error{
				min-height:30px;color:#F00;padding:5px;
				font-size:0.85rem;box-sizing:border-box;
			}
			.input-type-btn{
				align-self:center;margin:5px 10px;cursor:pointer;
			}
			
			[hidden]{display:none}
			.buttons{margin:var(--anuma-dialog-buttons-margin, 10px auto);display:flex;width:var(--anuma-dialog-buttons-width,90%);}
			.buttons flow-btn{margin:5px;}
			:host(.no-buttons) .body-inner>.buttons{display:none}
			.buttons flow-btn:first-child{margin-left:0px;}
			.buttons flow-btn:last-child{margin-right:0px;}
			.back-btn{--fa-icon-size:30px;margin:0px 20px 0px 10px;cursor:pointer}
			.body-box{
				display:flex;align-items:center;justify-content:center;overflow:hidden;
			}
			.body-inner{overflow:hidden;max-height:100%;display:flex;flex-direction:column;}
		`];
	}
	headingCls({modeName}){
		if(modeName == 'Init')
			return "heading-init";
		return '';
	}

	render(){
		const args = this.buildRenderArgs();
		let buttons = this.renderButtons(args);
		let hasButtons = !!buttons;
		return html`
			<div class="container">
				<h2 class="heading ${this.headingCls(args)}">${this.renderHeading(args)}</h2>
				<div class="flex body-box">
					<div class="body-inner">
						<div class="body">
							<div class="inner-body">
								${this.renderBody(args)}
							</div>
						</div>
						${hasButtons?html`
						<div class="buttons">
							${buttons}
						</div>`:''}
						<span class="close-btn" title="Close" 
							@click="${this.onCloseClick}">&times;</span>
					</div>
				</div>
			</div>
		`
	}
	constructor(){
		super();
		this._onUrlHistoryPop = e=>{
			this.onUrlHistoryPop(e.detail, e);
		}
		this.withHistory = window.isMobile;
	}
	attachUrlHistoryPopEvent(){
		if(this.withHistory)
			window.addEventListener("_popstate", this._onUrlHistoryPop);
	}
	removeUrlHistoryPopEvent(){
		window.removeEventListener("_popstate", this._onUrlHistoryPop);
	}
	connectedCallback(){
		super.connectedCallback();
		this.attachUrlHistoryPopEvent();
	}
	disconnectedCallback(){
		super.disconnectedCallback();
		this.removeUrlHistoryPopEvent();
	}

	onUrlHistoryPop({state, oldState}, e){
		if(oldState?.uid == this.uid){
			console.log("onUrlHistoryPop:", oldState?.uid == this.uid, {state, oldState})
			this._hide(true);
		}
	}
	pushHistory(uid=""){
		if(!this.withHistory)
			return
		let name = this.tagName || this.name || this.constructor.name;
		name = name.replace(/\-/g, "");
		let key = name.toLowerCase().replace(/(anuma|dialog|mobile)/g, '')
		let state = {type:name, uid, key};
		history.pushState(state, name, "/"+key+"/"+uid);
		historyStack.push(state)
	}
	historyGoBack(){
		history.back();
	}
	buildRenderArgs(){
		return {};
	}
	renderHeading(args){
		return '';
	}
	renderHeading(args){
		return '';
	}
	renderButtons(args){
		this.classList.add("no-buttons")
		return ''
	}
	renderBackBtn(){
		return html`<fa-icon class="back-btn" icon="arrow-alt-left"
			@click=${this.onBackClick}></fa-icon>`;
	}
	onBackClick(){
		this.hide();
	}

	firstUpdated(...args){
		super.firstUpdated(...args)
		this.qS = this.renderRoot.querySelector.bind(this.renderRoot);
		this.qSAll = this.renderRoot.querySelectorAll.bind(this.renderRoot);
	}
    setError(errorMessage){
    	this.errorMessage = errorMessage;
    }
    show(){
		this.classList.add('active');
		this.uid  = this.uid || UID()
		this.pushHistory(this.uid)
	}
	_hide(skipHistory=false){
		this.classList.remove('active');
		if(!skipHistory && this.withHistory){
			this.historyGoBack();
		}
	}
	hide(skipHistory=false){
		this._hide(skipHistory);
	}
	onCloseClick(){
		this.hide();
	}
	checkPassword(password){
    	return validatePassword(password);
    }
}
