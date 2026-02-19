import React from 'react';
import { Card } from '../components/ui/Card';
import { Video, MapPin } from 'lucide-react';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const Schedule: React.FC = () => {
  return (
    <div className="animate-slide-up space-y-8">
      <header>
        <h1 className="text-3xl font-display font-bold text-white">Академический Календарь</h1>
        <p className="text-zinc-500">Синхронизируй свое время для максимальной эффективности.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {DAYS.map((day, index) => (
            <div key={day} className={`flex flex-col gap-3 min-h-[300px] ${index < 5 ? 'lg:col-span-1' : 'lg:col-span-1 opacity-50'}`}>
                <div className="text-center pb-2 border-b border-zinc-800">
                    <span className="text-sm font-bold text-zinc-500 uppercase">{day}</span>
                    <div className={`mt-2 w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold ${index === 2 ? 'bg-kiddy-primary text-white' : 'text-zinc-300'}`}>
                        {12 + index}
                    </div>
                </div>

                {index === 2 && (
                    <Card className="bg-kiddy-primary/10 border-kiddy-primary/30 p-3 cursor-pointer hover:bg-kiddy-primary/20" noPadding>
                        <div className="p-3">
                            <span className="text-xs font-bold text-kiddy-primary mb-1 block">17:00 - 18:30</span>
                            <h4 className="font-bold text-white text-sm leading-tight">Advanced Python Logic</h4>
                            <div className="flex items-center gap-1 mt-2 text-zinc-400 text-xs">
                                <Video size={12} />
                                <span>Zoom Live</span>
                            </div>
                        </div>
                    </Card>
                )}

                {index === 5 && (
                    <Card className="bg-zinc-800 border-zinc-700 p-3" noPadding>
                        <div className="p-3">
                            <span className="text-xs font-bold text-zinc-400 mb-1 block">10:00 - 13:00</span>
                            <h4 className="font-bold text-zinc-300 text-sm leading-tight">Подготовка к Хакатону</h4>
                            <div className="flex items-center gap-1 mt-2 text-zinc-500 text-xs">
                                <MapPin size={12} />
                                <span>Кампус Комната 404</span>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        ))}
      </div>
    </div>
  );
};