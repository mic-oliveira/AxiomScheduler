import { AX_LOCALES } from './../locales';
import { Component, OnInit, ViewEncapsulation, Input, TemplateRef, ViewChildren, AfterViewInit, ViewChild, Injector, Output, EventEmitter, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import * as moment from 'moment';
import { AxiomSchedulerService } from '../services/axiom-scheduler.service';
import { Subscription } from 'rxjs';

export enum AxiomSchedulerView {
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Year = 'year'
}

export class AxiomSchedulerComponentCommon implements OnDestroy {

  @Input() axEvents: AxiomSchedulerEvent[];
  @Input() axStartDate: Date;
  @Input() axEventTemplate: TemplateRef<any>;
  @Input() axEventFormatter: (data: any, date?: Date) => string;
  @Input() axDragStep: number;
  @Input() axLocale: string;

  public today: moment.Moment;
  public date: moment.Moment;
  public service: AxiomSchedulerService;
  public subscriptionGarbageCollection: Subscription[] = [];

  constructor(protected injector: Injector) {
    this.today = moment();
    this.service = this.injector.get(AxiomSchedulerService);
    this.subscriptionGarbageCollection.push(this.service.refershRequest.subscribe((s) => {
      if (s) {
        this.date = s.clone();
        this.date.locale(this.service.schedulerLocale);
        this.refreshView();
      }
    }));
    this.subscriptionGarbageCollection.push(this.service.locale.subscribe((locale) => {
      moment.locale(locale);
      if (this.date) {
        this.date.locale(this.service.schedulerLocale);
        this.refreshView();
      }
    }));
  }

  public refresh(): void {
    this.date = this.axStartDate ? moment(this.axStartDate) : moment(Date.now());
  }

  public refreshView(): void { }

  public ngOnDestroy(): void {
    if (Array.isArray(this.subscriptionGarbageCollection)) {
      this.subscriptionGarbageCollection.forEach(g => g && g.unsubscribe());
    }
    this.baseDestroy();
  }

  public baseDestroy(): void { }

}

export class AxiomSchedulerEvent {
  public from: Date;
  public to: Date;
  public data: any;
  public color : string;
  constructor(from: Date = null, to: Date = null, data: any = null,color : string = null) {
    this.data = data;
    this.from = from;
    this.to = to;
    this.color = color;
  }
}

@Component({
  selector: 'ax-scheduler',
  templateUrl: './axiom-scheduler.component.html',
  styleUrls: ['./axiom-scheduler.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [AxiomSchedulerService],
  host: {
    'class': 'ax-scheduler'
  }
})
export class AxiomSchedulerComponent extends AxiomSchedulerComponentCommon implements OnInit {

  @Input() axSchedulerView: AxiomSchedulerView;
  @Input() axTheme: 'light' | 'dark';
  @Input() axShowLocale : boolean = true;
  @Input() axViews : AxiomSchedulerView[];
  
  @Output() axEventChange = new EventEmitter<AxiomSchedulerEvent>();
  @Output() axEventClick = new EventEmitter<AxiomSchedulerEvent>();
  @Output() axDateChange = new EventEmitter<Date>();
  @Output() axViewChange = new EventEmitter<AxiomSchedulerView>();

  public items = [];
  public locales = AX_LOCALES.map((v) => {
    return { id: v, title: v };
  });

  constructor(injector: Injector,private _element:ElementRef,private _renderer : Renderer2) {
    super(injector);
  }

  public ngOnInit(): void  {
    this.axLocale = this.axLocale || 'en';
    this.setListeners();
    this.refreshScheduler();
  }

  public refreshScheduler(){
    this.updateTheme(this.axTheme);
    this.refresh();
    this.setViews();
  }

  public prev(): void {
    this.step(-1);
    this.service.refreshDate(this.date);
  }

  public next(): void {
    this.step(1);
    this.service.refreshDate(this.date);
  }

  public todayF(): void  {
    this.date = moment();
    this.service.refreshDate(this.date);
    this.axDateChange && this.axDateChange.emit(this.date.clone().toDate());
  }

  public modelFormatter(value: any): any {
    return value ? value.id : null;
  }

  public setLocale(locale: string): void {
    this.service.changeLocale(locale);
  }

  public updateTheme(theme:'light' | 'dark') : void{
    if(theme){
      this._renderer.removeClass(this._element.nativeElement,'dark');
      this._renderer.removeClass(this._element.nativeElement,'light');
      this._renderer.addClass(this._element.nativeElement,theme);
    }
  }

  public changeView(view : any) : void{
    this.axSchedulerView = view.id;
    this.axViewChange && this.axViewChange.emit(view.id);
  }

  private step(step: number): void {
    switch (this.axSchedulerView) {
      case AxiomSchedulerView.Day:
        this.date = this.date.clone().add(step, 'days');
        break;
      case AxiomSchedulerView.Week:
        this.date = this.date.clone().add(step, 'weeks');
        break;
      case AxiomSchedulerView.Month:
        this.date = this.date.clone().add(step, 'months');
        break;
      case AxiomSchedulerView.Year:
        this.date = this.date.clone().add(step, 'years');
        break;
    }
    this.axDateChange && this.axDateChange.emit(this.date.clone().toDate());
  }

  private setViews() : void{
    var def = [
      { id: AxiomSchedulerView.Day, title: 'Day' },
      { id: AxiomSchedulerView.Week, title: 'Week' },
      { id: AxiomSchedulerView.Month, title: 'Month' },
      { id: AxiomSchedulerView.Year, title: 'Year' }
    ];
    if(Array.isArray(this.axViews)){
      this.items = [...def.filter(i=>this.axViews.indexOf(i.id) >= 0)];
    }
    else{
      this.items = [...def];
    }
    if(!this.axSchedulerView){
      this.axSchedulerView = this.items[0].id;
    }
  }

  private setListeners() : void{
    this.subscriptionGarbageCollection.push(this.service.eventChange.subscribe(event => {
      this.axEventChange && this.axEventChange.emit(event);
    }));
    this.subscriptionGarbageCollection.push(this.service.eventClick.subscribe(event => {
      this.axEventClick && this.axEventClick.emit(event);
    }));
  }

}
