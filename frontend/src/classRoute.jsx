import { useState } from "react";
import { ClassesPage, ClassDetailPage } from "./classes";
import { ClassRegistrationModal } from "./classRegister";

/* Hosts the registration modal for both class routes so the pages
   themselves stay presentational. */
const withRegistration = (Page) => () => {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <Page onRegister={setSelected} />
      <ClassRegistrationModal item={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </>
  );
};

export const ClassesRoute = withRegistration(ClassesPage);
export const ClassDetailRoute = withRegistration(ClassDetailPage);
