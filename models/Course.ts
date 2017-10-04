import * as orm from "typeorm";
import CourseTitle from "./enums/CourseTitle";
import CourseSection from "./enums/CourseSection";
import Resource from "./Resource";

@orm.Entity()
export default class Course {
    public constructor(init: Partial<Course>) {
        Object.assign(this, init);
    }

    @orm.PrimaryGeneratedColumn()
    public id: number;

    @orm.Column({ nullable: false })
    public title: CourseTitle;

    @orm.Column({ nullable: false })
    public section: CourseSection;

    @orm.OneToMany(t => Resource, r => r.course)
    public resources?: Resource[];
}
