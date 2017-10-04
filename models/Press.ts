import * as orm from "typeorm";

@orm.Entity()
export default class Press {
    public constructor(init: Partial<Press>) {
        Object.assign(this, init);
    }

    @orm.PrimaryGeneratedColumn()
    public id: number;

    @orm.Column()
    public title: string;

    @orm.Column()
    public link: string;

    @orm.Column()
    public author: string;
}
